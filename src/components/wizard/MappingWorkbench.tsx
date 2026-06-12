"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Sparkles, Check, AlertTriangle, X } from "lucide-react";
import clsx from "clsx";
import useSWRMutation from "swr/mutation";

import { MappingReviewTable } from "@/components/MappingReviewTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { toast } from "@/components/ui/sonner";
import type { ColumnProfile, FieldMapping, TargetField } from "@/lib/mapping/mapping.types";

type MissingFieldsInfo = {
  missingRequiredFields: string[];
  detection: {
    headerRowIndex: number;
    matchedFields: Array<{ headerIndex: number; headerName: string; templatePath: string }>;
    confidence: number;
    ambiguous: boolean;
  };
};

type WorkbenchPhase = "init" | "creating-run" | "analyzing" | "review" | "confirming" | "output" | "error";

type LogEntry = {
  id: number;
  message: string;
  level: "info" | "success" | "warning";
};

type CreateRunResponse = {
  run: {
    id: string;
    targetFields: TargetField[];
    columnProfiles: ColumnProfile[];
    sampleRows: Record<string, unknown>[];
    status: string;
    suggestedMapping?: { mappings: FieldMapping[] } | null;
  };
  missingRequiredFields?: string[];
  detection?: {
    headerRowIndex: number;
    matchedFields: Array<{ headerIndex: number; headerName: string; templatePath: string }>;
    confidence: number;
    ambiguous: boolean;
  };
  warning?: string;
  error?: string;
};

type SuggestResponse = {
  run: {
    id: string;
    suggestedMapping: { mappings: FieldMapping[] };
    targetFields: TargetField[];
    status: string;
  };
};

type ConfirmResponse = {
  run: {
    id: string;
    status: string;
  };
};

type OutputResponse = {
  output: {
    jsonOutput: unknown;
  };
  validation: {
    valid: boolean;
    errors: unknown;
  };
};

type MappingWorkbenchProps = {
  onBack?: () => void;
  onComplete?: () => void;
};

function formatTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function jsonPreviewFromMappings(mappings: FieldMapping[]): string {
  const obj: Record<string, unknown> = {};
  for (const m of mappings) {
    if (m.sourceColumn || m.constantValue) {
      const keys = m.targetPath.split(".");
      let current = obj;
      for (let i = 0; i < keys.length; i++) {
        if (i === keys.length - 1) {
          current[keys[i]] = m.constantValue ?? `{{${m.sourceColumn}}}`;
        } else {
          current[keys[i]] = current[keys[i]] ?? {};
          current = current[keys[i]] as Record<string, unknown>;
        }
      }
    }
  }
  return JSON.stringify(obj, null, 2);
}

export function MappingWorkbench({ onBack, onComplete }: MappingWorkbenchProps) {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const sheet = searchParams.get("sheet");
  const templateId = searchParams.get("templateId");

  const [phase, setPhase] = useState<WorkbenchPhase>("init");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingFieldsInfo, setMissingFieldsInfo] = useState<MissingFieldsInfo | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [targetFields, setTargetFields] = useState<TargetField[]>([]);
  const [columnProfiles, setColumnProfiles] = useState<ColumnProfile[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([
    { id: 0, message: "Initializing mapping engine...", level: "info" },
  ]);
  const nextId = useRef(1);
  const startRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const liveFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveFeedRef.current) {
      const viewport = liveFeedRef.current.parentElement;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [entries]);

  const addLog = useCallback((message: string, level: LogEntry["level"] = "info") => {
    setEntries((current) => [
      ...current,
      { id: nextId.current++, message, level },
    ]);
  }, []);

  const runPhase = useCallback(async () => {
    if (!uploadId || !templateId) {
      setPhase("error");
      setErrorMessage("Missing upload ID or template ID. Please go back and try again.");
      return;
    }

    setPhase("creating-run");
    addLog("Creating mapping run...", "info");

    try {
      const createRes = await fetch("/api/mapping-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedFileId: uploadId,
          schemaTemplateId: templateId,
          sourceSheetName: sheet || null,
        }),
      });
      const createData: CreateRunResponse = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 422 && createData.missingRequiredFields) {
          setMissingFieldsInfo({
            missingRequiredFields: createData.missingRequiredFields,
            detection: createData.detection ?? { headerRowIndex: 0, matchedFields: [], confidence: 0, ambiguous: false },
          });
          throw new Error(`Required fields missing from workbook: ${(createData.missingRequiredFields as string[]).join(", ")}`);
        }
        throw new Error(createData.error ?? "Failed to create mapping run.");
      }

      const run = createData.run;
      setRunId(run.id);
      setTargetFields(run.targetFields);
      setColumnProfiles(run.columnProfiles);
      addLog(`Run created — ${run.targetFields.length} target fields detected`, "success");
      if (createData.warning) {
        setWarningMessage(createData.warning);
        addLog(createData.warning, "warning");
      }

      setPhase("analyzing");
      startRef.current = Date.now();
      addLog("Analyzing column headers and sample data...", "info");
      addLog("Comparing with target schema fields...", "info");

      const suggestRes = await fetch(`/api/mapping-runs/${run.id}/suggest`, {
        method: "POST",
      });
      const suggestData: SuggestResponse & { error?: string } = await suggestRes.json();

      if (!suggestRes.ok) {
        throw new Error(suggestData.error ?? "AI matching failed.");
      }

      const suggested = suggestData.run.suggestedMapping?.mappings ?? [];
      setMappings(suggested);
      addLog("AI matching completed successfully", "success");

      const autoMapped = suggested.filter((m) => m.sourceColumn && m.confidence >= 0.5).length;
      const needsReview = suggested.filter((m) => !m.sourceColumn || m.confidence < 0.5).length;
      addLog(`${autoMapped} fields auto-mapped, ${needsReview} need review`, "info");

      setPhase("review");
    } catch (err) {
      setPhase("error");
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      addLog(msg, "warning");
    }
  }, [uploadId, templateId, sheet, addLog]);

  useEffect(() => {
    if (phase !== "init") return;

    if (!uploadId || !templateId) {
      setPhase("error");
      setErrorMessage("Missing upload ID or template ID.");
      return;
    }

    const timer = setTimeout(() => {
      void runPhase();
    }, 600);

    return () => clearTimeout(timer);
  }, [phase, uploadId, templateId, runPhase]);

  useEffect(() => {
    if (phase !== "analyzing" || !startRef.current) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000));
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [phase]);

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleConfirm = useCallback(async () => {
    if (!runId) return;
    setPhase("confirming");
    addLog("Saving confirmed mappings...", "info");

    try {
      const confirmRes = await fetch(`/api/mapping-runs/${runId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });
      const confirmData: ConfirmResponse & { error?: string } = await confirmRes.json();

      if (!confirmRes.ok) {
        throw new Error(confirmData.error ?? "Failed to confirm mappings.");
      }

      addLog("Mappings confirmed", "success");

      setPhase("output");
      addLog("Generating output JSON...", "info");

      const outputRes = await fetch(`/api/mapping-runs/${runId}/output`, {
        method: "POST",
      });
      const outputData: OutputResponse & { error?: string } = await outputRes.json();

      if (!outputRes.ok) {
        throw new Error(outputData.error ?? "Output generation failed.");
      }

      addLog("Output generated successfully", "success");
      toast.success("Output ready", { description: "Your mapped data is ready to export." });
      onComplete?.();
    } catch (err) {
      setPhase("review");
      const msg = err instanceof Error ? err.message : "Confirmation failed.";
      toast.error("Confirmation failed", { description: msg });
    }
  }, [runId, mappings, addLog, onComplete]);

  const autoMappedCount = mappings.filter((m) => m.sourceColumn && m.confidence >= 0.5).length;
  const needsReviewCount = mappings.filter((m) => m.sourceColumn && m.confidence < 0.5).length;
  const unmappedCount = mappings.filter((m) => !m.sourceColumn).length;
  const totalFields = targetFields.length;
  const blockingUnmapped = targetFields.filter((f) => f.required && !mappings.some((m) => m.targetPath === f.path && (m.sourceColumn || m.constantValue))).length;
  const isReady = phase === "review" && blockingUnmapped === 0;

  const isBusy = phase === "creating-run" || phase === "analyzing" || phase === "confirming" || phase === "output";

  if (phase === "creating-run" || phase === "analyzing") {
    const progressPercent = Math.min(100, Math.round((elapsed / 12) * 100));

    return (
      <div className="mx-auto flex min-h-0 h-full w-full max-w-[800px] flex-1 flex-col gap-6 px-1 overflow-hidden">
        {warningMessage ? (
          <div className="rounded-xl border border-[rgba(255,214,102,0.3)] bg-[rgba(255,214,102,0.1)] px-5 py-3 text-sm text-[var(--color-warning)]">
            {warningMessage}
          </div>
        ) : null}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)]">
          <div className="flex flex-col items-center px-10 pb-6 pt-10 text-center">
            <h3 className="m-0 font-[var(--font-display)] text-[clamp(2.2rem,3.6vw,3.2rem)] font-semibold tracking-[-0.07rem] text-[var(--color-ink)]">
              Mapping Intelligence
            </h3>
            <p className="m-0 mt-4 max-w-[42ch] text-[1rem] leading-relaxed text-[var(--color-muted)]">
              AI is matching your column headers to the target schema.
            </p>
          </div>

          <div className="mx-6 mb-6 overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[rgba(247,244,237,0.55)] px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="h-1 overflow-hidden rounded-full bg-[var(--color-ink-06)]">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  phase === "analyzing" ? "bg-[var(--color-ink-40)] animate-shimmer" : "bg-[var(--color-success)]",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[0.78rem] text-[var(--color-muted)]">
              {phase === "creating-run" ? "Preparing mapping environment..." : "Analyzing columns and generating suggestions..."}
            </p>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink)]">
                Live Activity
              </span>
              <span className="block h-2 w-2 rounded-full bg-[var(--color-error)] animate-pulse" />
            </div>
          </div>

          <ScrollArea className="max-h-[200px]">
            <div ref={liveFeedRef} className="flex flex-col gap-0 px-6 py-4">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={clsx(
                    "flex items-start gap-3 py-1.5 text-[0.8rem] leading-relaxed",
                    entry.level === "success" && "text-[var(--color-success)]",
                    entry.level === "warning" && "text-[var(--color-warning)]",
                    entry.level === "info" && "text-[var(--color-ink-82)]",
                  )}
                >
                  <span className="shrink-0 font-[var(--font-mono)] text-[0.68rem] text-[var(--color-ink-40)]">
                    {formatTime(new Date(Date.now() - (entries.length - index) * 800))}
                  </span>
                  <span className="min-w-0">{entry.message}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 py-1.5 text-[0.75rem] italic text-[var(--color-muted)]">
                <span className="shrink-0 font-[var(--font-mono)] text-[0.68rem] text-[var(--color-ink-40)]">
                  {formatTime(new Date())}
                </span>
                <span>Processing...</span>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-[600px] flex-1 flex-col items-center gap-6 px-1">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(176,0,32,0.08)]">
            <X className="h-8 w-8 text-[var(--color-error)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-ink)]">Mapping setup failed</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{errorMessage}</p>
        </div>

        {missingFieldsInfo ? (
          <div className="w-full rounded-xl border border-[rgba(176,0,32,0.15)] bg-[rgba(176,0,32,0.04)] p-5">
            <h4 className="text-sm font-semibold text-[var(--color-error)]">Missing required fields</h4>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              These fields are required by the schema but were not found in your workbook. Add columns matching these names and re-upload.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingFieldsInfo.missingRequiredFields.map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-[rgba(176,0,32,0.2)] bg-[rgba(176,0,32,0.06)] px-3 py-1 text-xs font-medium text-[var(--color-error)]"
                >
                  {field}
                </span>
              ))}
            </div>
            {missingFieldsInfo.detection.confidence > 0 ? (
              <div className="mt-4 border-t border-[rgba(176,0,32,0.1)] pt-3">
                <p className="text-xs text-[var(--color-muted)]">
                  Header detection confidence: {Math.round(missingFieldsInfo.detection.confidence * 100)}%
                  {missingFieldsInfo.detection.ambiguous ? " (ambiguous)" : ""}
                  &nbsp;&middot; Header row: {missingFieldsInfo.detection.headerRowIndex + 1}
                </p>
                {missingFieldsInfo.detection.matchedFields.length > 0 ? (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {missingFieldsInfo.detection.matchedFields.length} field{missingFieldsInfo.detection.matchedFields.length > 1 ? "s" : ""} matched: {missingFieldsInfo.detection.matchedFields.map((f) => f.headerName).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack}>Back to upload</Button>
          <Button onClick={() => { setPhase("init"); setErrorMessage(null); setMissingFieldsInfo(null); setWarningMessage(null); setEntries([{ id: nextId.current++, message: "Retrying...", level: "info" }]); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 h-full w-full flex-1 flex-col gap-6 overflow-hidden">
      {phase === "confirming" || phase === "output" ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] px-6 py-4">
          <span className="block h-3 w-3 rounded-full bg-[var(--color-warning)] animate-pulse" />
          <span className="text-sm text-[var(--color-muted)]">
            {phase === "confirming" ? "Saving your mappings..." : "Generating output..."}
          </span>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden max-xl:flex-col">
        <div className="min-w-0 min-h-0 flex-1 overflow-hidden">
          <MappingReviewTable
            targetFields={targetFields}
            columns={columnProfiles}
            mappings={mappings}
            onChange={setMappings}
          />
        </div>

        <aside className="flex min-h-0 w-full shrink-0 flex-col gap-4 xl:w-[340px]">
          <div className="rounded-[2rem] border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] p-6">
            <Badge variant="outline" className="rounded-full">Readiness summary</Badge>
            <h3 className="mt-4 text-lg font-semibold">
              {isReady ? "Ready to confirm" : "Review required"}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {isReady
                ? "All required fields are mapped. You can proceed to generate output."
                : `${blockingUnmapped} required field${blockingUnmapped > 1 ? "s" : ""} still need attention.`}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(45,106,79,0.06)] px-3 py-3 text-center">
                <div className="text-xl font-bold text-[var(--color-success)]">{autoMappedCount}</div>
                <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Auto</div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,214,102,0.12)] px-3 py-3 text-center">
                <div className="text-xl font-bold text-[var(--color-warning)]">{needsReviewCount}</div>
                <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Review</div>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(176,0,32,0.06)] px-3 py-3 text-center">
                <div className="text-xl font-bold text-[var(--color-error)]">{unmappedCount}</div>
                <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Unmapped</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                <span>Progress</span>
                <span>{totalFields > 0 ? `${autoMappedCount + needsReviewCount}/${totalFields}` : "0/0"}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-ink-06)]">
                <div
                  className="h-full rounded-full bg-[var(--color-success)] transition-all duration-300"
                  style={{ width: totalFields > 0 ? `${((autoMappedCount + needsReviewCount) / totalFields) * 100}%` : "0%" }}
                />
              </div>
            </div>

            {blockingUnmapped > 0 ? (
              <div className="mt-4 rounded-xl border border-[rgba(176,0,32,0.15)] bg-[rgba(176,0,32,0.04)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-error)]">
                  <AlertTriangle className="h-4 w-4" />
                  {blockingUnmapped} blocking issue{blockingUnmapped > 1 ? "s" : ""}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Required fields without mapping will prevent output generation.
                </p>
              </div>
            ) : mappings.length > 0 ? (
              <div className="mt-4 rounded-xl border border-[rgba(45,106,79,0.15)] bg-[rgba(45,106,79,0.04)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-success)]">
                  <Check className="h-4 w-4" />
                  All requirements met
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col rounded-[2rem] border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] p-6">
            <Badge variant="outline" className="rounded-full">JSON preview</Badge>
            <h3 className="mt-4 text-lg font-semibold">Output shape</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Structural preview based on current mappings. Actual values are applied during generation.
            </p>
            <ScrollArea className="mt-4 max-h-[280px] rounded-xl border border-[var(--color-border)] bg-[#fffdfa] p-4">
              <pre className="m-0 text-[0.72rem] leading-relaxed text-[var(--color-ink)]">
                {mappings.length > 0 ? jsonPreviewFromMappings(mappings) : "// No mappings yet"}
              </pre>
            </ScrollArea>
          </div>
        </aside>
      </div>

      <WizardFooter
        statusText={
          phase === "review" && isReady
            ? "Ready to confirm"
            : phase === "review" && !isReady
              ? `${blockingUnmapped} required field${blockingUnmapped > 1 ? "s" : ""} unmapped`
              : phase === "confirming"
                ? "Confirming mappings..."
                : phase === "output"
                  ? "Generating output..."
                  : "Processing"
        }
        statusReady={isReady}
        primaryLabel={phase === "confirming" || phase === "output" ? "Processing..." : "Confirm & Generate"}
        onPrimary={handleConfirm}
        primaryDisabled={!isReady || isBusy}
        secondaryLabel="Back"
        onSecondary={handleBack}
      />
    </div>
  );
}
