"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Sparkles, Check, AlertTriangle, X, Eye, Circle, RotateCcw } from "lucide-react";
import clsx from "clsx";

import { MappingReviewTable } from "@/components/MappingReviewTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type StepStatus = "pending" | "processing" | "done";

type ActivityStep = {
  id: number;
  label: string;
  status: StepStatus;
  elapsed: number | null;
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
    suggestDiagnostics?: {
      heuristicComplete?: boolean;
    };
  };
};

type ConfirmResponse = {
  run: {
    id: string;
    status: string;
  };
  mappingTemplateId?: string;
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
  onComplete?: (runId?: string, mappingTemplateId?: string) => void;
  initialRunId?: string;
  initialTargetFields?: TargetField[];
  initialColumnProfiles?: ColumnProfile[];
  initialMappings?: FieldMapping[];
};

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

function getDefaultActivitySteps(t: (key: string) => string): ActivityStep[] {
  return [
    { id: 0, label: t("wizard.mapping.activityPreparing"), status: "pending", elapsed: null },
    { id: 1, label: t("wizard.mapping.activityReading"), status: "pending", elapsed: null },
    { id: 2, label: t("wizard.mapping.activityFinding"), status: "pending", elapsed: null },
    { id: 3, label: t("wizard.mapping.activityChecking"), status: "pending", elapsed: null },
    { id: 4, label: t("wizard.mapping.activityComplete"), status: "pending", elapsed: null },
    { id: 5, label: t("wizard.mapping.activityPreparingReview"), status: "pending", elapsed: null },
  ];
}

export function MappingWorkbench({
  onBack,
  onComplete,
  initialRunId,
  initialTargetFields,
  initialColumnProfiles,
  initialMappings,
}: MappingWorkbenchProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const sheet = searchParams.get("sheet");
  const templateId = searchParams.get("templateId");

  const [phase, setPhase] = useState<WorkbenchPhase>(
    initialTargetFields && initialMappings ? "review" : initialTargetFields && initialColumnProfiles && initialColumnProfiles.length > 0 ? "review" : "init",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingFieldsInfo, setMissingFieldsInfo] = useState<MissingFieldsInfo | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(initialRunId ?? null);
  const [targetFields, setTargetFields] = useState<TargetField[]>(initialTargetFields ?? []);
  const [columnProfiles, setColumnProfiles] = useState<ColumnProfile[]>(initialColumnProfiles ?? []);
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings ?? []);

  const [activitySteps, setActivitySteps] = useState<ActivityStep[]>(getDefaultActivitySteps(t));
  const [completedStepIds, setCompletedStepIds] = useState<Set<number>>(new Set());
  const [showSoftMessage, setShowSoftMessage] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false);
  const [retriggerConfirmOpen, setRetriggerConfirmOpen] = useState(false);
  const [retriggerCooldown, setRetriggerCooldown] = useState(0);
  const [heuristicComplete, setHeuristicComplete] = useState(false);
  const stepStartTimes = useRef<Map<number, number>>(new Map());
  const processStartTimeRef = useRef<number>(0);
  const retriggerCooldownRef = useRef(0);
  const [tick, setTick] = useState(0);

  const updateStepStatus = useCallback((stepId: number, status: StepStatus) => {
    const now = Date.now();
    if (status === "processing") {
      stepStartTimes.current.set(stepId, now);
    }
    setActivitySteps((prev) =>
      prev.map((s) => {
        if (s.id !== stepId) return s;
        if (status === "processing") return { ...s, status, elapsed: 0 };
        if (status === "done") {
          const start = stepStartTimes.current.get(stepId);
          const elapsed = start != null ? Math.round((now - start) / 1000) : s.elapsed;
          return { ...s, status, elapsed };
        }
        return { ...s, status };
      }),
    );
    if (status === "done") {
      setCompletedStepIds((prev) => new Set(prev).add(stepId));
    }
  }, []);

  const markStepsRange = useCallback((ids: number[], status: StepStatus) => {
    setActivitySteps((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status } : s)),
    );
  }, []);

  const runPhase = useCallback(async () => {
    setPhase("creating-run");
    processStartTimeRef.current = Date.now();
    updateStepStatus(0, "done");
    await new Promise((r) => setTimeout(r, 350));
    updateStepStatus(1, "processing");

    try {
      if (runId) {
        const profileRes = await fetch(`/api/mapping-runs/${runId}/profile`, {
          method: "POST",
        });
        const profileData: CreateRunResponse & { error?: string } = await profileRes.json();

        if (!profileRes.ok) {
          throw new Error(profileData.error ?? "Failed to profile run.");
        }

        const profileRun = profileData.run;
        setRunId(profileRun.id);
        setTargetFields(profileRun.targetFields);
        setColumnProfiles(profileRun.columnProfiles);
        updateStepStatus(1, "done");
        if (profileData.warning) {
          setWarningMessage(profileData.warning);
        }

        await new Promise((r) => setTimeout(r, 400));
        setPhase("analyzing");
        updateStepStatus(2, "processing");

        const suggestRes = await fetch(`/api/mapping-runs/${profileRun.id}/suggest`, {
          method: "POST",
        });
        const suggestData: SuggestResponse & { error?: string } = await suggestRes.json();

        if (!suggestRes.ok) {
          throw new Error(suggestData.error ?? "AI matching failed.");
        }

        updateStepStatus(2, "done");

        const suggested2 = suggestData.run.suggestedMapping?.mappings ?? [];
        setMappings(suggested2);
        setHeuristicComplete(suggestData.run.suggestDiagnostics?.heuristicComplete ?? false);
        await new Promise((r) => setTimeout(r, 300));
        updateStepStatus(3, "done");

        await new Promise((r) => setTimeout(r, 300));
        updateStepStatus(4, "done");

        updateStepStatus(5, "processing");
        await new Promise((r) => setTimeout(r, 2000));
        updateStepStatus(5, "done");

        setPhase("review");
        return;
      }

      if (!uploadId || !templateId) {
        setPhase("error");
        setErrorMessage("Missing upload ID or template ID. Please go back and try again.");
        return;
      }

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
      updateStepStatus(1, "done");
      if (createData.warning) {
        setWarningMessage(createData.warning);
      }

      await new Promise((r) => setTimeout(r, 400));
      setPhase("analyzing");
      updateStepStatus(2, "processing");

      const suggestRes = await fetch(`/api/mapping-runs/${run.id}/suggest`, {
        method: "POST",
      });
      const suggestData2: SuggestResponse & { error?: string } = await suggestRes.json();

      if (!suggestRes.ok) {
        throw new Error(suggestData2.error ?? "AI matching failed.");
      }

      updateStepStatus(2, "done");

      const suggested = suggestData2.run.suggestedMapping?.mappings ?? [];
      setMappings(suggested);
      setHeuristicComplete(suggestData2.run.suggestDiagnostics?.heuristicComplete ?? false);
      await new Promise((r) => setTimeout(r, 300));
      updateStepStatus(3, "done");

      await new Promise((r) => setTimeout(r, 300));
      updateStepStatus(4, "done");

      updateStepStatus(5, "processing");
      await new Promise((r) => setTimeout(r, 2000));
      updateStepStatus(5, "done");

      setPhase("review");
    } catch (err) {
      setPhase("error");
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    }
  }, [uploadId, templateId, sheet, runId, updateStepStatus]);

  useEffect(() => {
    if (phase !== "init") return;

    if (!uploadId && !runId) {
      setPhase("error");
      setErrorMessage("Missing upload ID or template ID.");
      return;
    }

    const timer = setTimeout(() => {
      void runPhase();
    }, 600);

    return () => clearTimeout(timer);
  }, [phase, uploadId, templateId, runPhase, runId]);

  useEffect(() => {
    if (
      phase !== "init" &&
      phase !== "creating-run" &&
      phase !== "analyzing"
    ) {
      setShowSoftMessage(false);
      setShowManualButton(false);
      return;
    }

    if (processStartTimeRef.current === 0) {
      setShowSoftMessage(false);
      setShowManualButton(false);
      return;
    }

    const now = Date.now();
    const elapsedMs = now - processStartTimeRef.current;
    const columnCount = columnProfiles.length;
    const targetFieldCount = targetFields.length;

    let threshold = 25_000;

    if (columnCount > 50) threshold += 10_000;
    if (columnCount > 100) threshold += 15_000;
    if (targetFieldCount > 50) threshold += 10_000;

    setShowSoftMessage(elapsedMs >= 10_000);
    setShowManualButton(elapsedMs >= threshold);
  }, [tick, phase, columnProfiles, targetFields]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      if (retriggerCooldownRef.current > 0) {
        const remaining = Math.max(0, Math.ceil((retriggerCooldownRef.current - Date.now()) / 1000));
        setRetriggerCooldown(remaining);
        if (remaining === 0) {
          retriggerCooldownRef.current = 0;
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const now = Date.now();
    setActivitySteps((prev) =>
      prev.map((s) => {
        if (s.status !== "processing") return s;
        const start = stepStartTimes.current.get(s.id);
        if (start == null) return s;
        return { ...s, elapsed: Math.round((now - start) / 1000) };
      }),
    );
  }, [tick]);

  const formatElapsed = (s: number) =>
    s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

  const handleBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  const handleConfirm = useCallback(async () => {
    if (!runId) return;

    const unmappedRequired = targetFields.filter(
      (f) => f.required && !mappings.some((m) => m.targetPath === f.path && (m.sourceColumn || m.constantValue)),
    );
    if (unmappedRequired.length > 0) {
      const names = unmappedRequired.map((f) => f.path).join(", ");
      toast.error(t("wizard.mapping.requiredUnmapped"), {
        description: t(unmappedRequired.length === 1 ? "wizard.mapping.requiredUnmappedDesc" : "wizard.mapping.requiredUnmappedDescPlural", { count: String(unmappedRequired.length), names }),
      });
      return;
    }

    setPhase("confirming");

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

      setPhase("output");

      const outputRes = await fetch(`/api/mapping-runs/${runId}/output`, {
        method: "POST",
      });
      const outputData: OutputResponse & { error?: string } = await outputRes.json();

      if (!outputRes.ok) {
        throw new Error(outputData.error ?? "Output generation failed.");
      }

      toast.success(t("wizard.mapping.toastOutputReady"), { description: t("wizard.mapping.toastOutputReadyDesc") });
      onComplete?.(runId, confirmData.mappingTemplateId);
    } catch (err) {
      setPhase("review");
      const msg = err instanceof Error ? err.message : t("wizard.mapping.toastConfirmFailed");
      toast.error(t("wizard.mapping.toastConfirmFailed"), { description: msg });
    }
  }, [runId, mappings, targetFields, onComplete]);

  const handleRetriggerAutoMapping = useCallback(async () => {
    if (!runId) return;

    retriggerCooldownRef.current = Date.now() + 30000;
    setRetriggerCooldown(30);

    processStartTimeRef.current = Date.now();
    setPhase("analyzing");
    setActivitySteps(getDefaultActivitySteps(t).map((s) => ({ ...s, status: "pending" as StepStatus, elapsed: null })));
    setCompletedStepIds(new Set());
    stepStartTimes.current.clear();

    updateStepStatus(0, "done");
    await new Promise((r) => setTimeout(r, 300));
    updateStepStatus(1, "done");
    await new Promise((r) => setTimeout(r, 300));
    updateStepStatus(2, "processing");

    try {
      const suggestRes = await fetch(`/api/mapping-runs/${runId}/suggest`, {
        method: "POST",
      });
      const suggestData: SuggestResponse & { error?: string } = await suggestRes.json();

      if (!suggestRes.ok) {
        throw new Error(suggestData.error ?? "AI matching failed.");
      }

      updateStepStatus(2, "done");
      const suggested3 = suggestData.run.suggestedMapping?.mappings ?? [];
      setMappings(suggested3);
      setHeuristicComplete(suggestData.run.suggestDiagnostics?.heuristicComplete ?? false);

      await new Promise((r) => setTimeout(r, 300));
      updateStepStatus(3, "done");
      await new Promise((r) => setTimeout(r, 300));
      updateStepStatus(4, "done");

      updateStepStatus(5, "processing");
      await new Promise((r) => setTimeout(r, 1500));
      updateStepStatus(5, "done");

      setPhase("review");
      toast.success(t("wizard.mapping.toastAutoMappingComplete"), {
        description: t("wizard.mapping.toastAutoMappingDesc"),
      });
    } catch (err) {
      setPhase("review");
      toast.error(t("wizard.mapping.toastAutoMappingFailed"), {
        description: err instanceof Error ? err.message : t("wizard.mapping.toastAutoMapErrorDesc"),
      });
    }
  }, [runId, updateStepStatus]);

  const autoMappedCount = mappings.filter((m) => m.sourceColumn && m.confidence >= 0.5).length;
  const needsReviewCount = mappings.filter((m) => m.sourceColumn && m.confidence < 0.5).length;
  const unmappedCount = mappings.filter((m) => !m.sourceColumn).length;
  const totalFields = targetFields.length;
  const blockingUnmapped = targetFields.filter((f) => f.required && !mappings.some((m) => m.targetPath === f.path && (m.sourceColumn || m.constantValue))).length;
  const isReady = phase === "review" && blockingUnmapped === 0;

  const isBusy = phase === "creating-run" || phase === "analyzing" || phase === "confirming" || phase === "output";

  if (phase === "init" || phase === "creating-run" || phase === "analyzing") {
    return (
      <div className="mx-auto flex min-h-0 h-full w-full max-w-[800px] flex-1 flex-col justify-center gap-6 px-1 overflow-hidden relative">
        {warningMessage ? (
          <div className="rounded-xl border border-[rgba(255,214,102,0.3)] bg-[rgba(255,214,102,0.1)] px-5 py-3 text-sm text-[var(--color-warning)]">
            {warningMessage}
          </div>
        ) : null}
        <div className="flex flex-col overflow-hidden rounded-xl bg-transparent">
          <div className="flex flex-col items-center px-10 pb-6 pt-10 text-center">
            <h3 className="m-0 font-[var(--font-display)] text-[clamp(2.2rem,3.6vw,3.2rem)] font-semibold tracking-[-0.07rem] text-[var(--color-ink)]">
              {t("wizard.mapping.workbenchTitle")}
            </h3>
            <p className="m-0 mt-4 max-w-[42ch] text-[1rem] leading-relaxed text-[var(--color-muted)]">
              {t("wizard.mapping.workbenchDesc")}
            </p>
          </div>

          <div className="mx-6 mb-6 overflow-hidden rounded-lg bg-[rgba(247,244,237,0.55)] px-6 py-6">
            <div className="flex flex-col items-center gap-3">
              {activitySteps.map((step) => (
                <div
                  key={step.id}
                  className={clsx(
                    "flex items-center gap-3 py-1 text-[0.82rem] leading-relaxed transition-colors duration-300",
                    step.status === "pending" && "text-[var(--color-ink-30)]",
                    step.status === "processing" && "text-[var(--color-ink)] font-medium",
                    step.status === "done" && "text-[var(--color-success)]",
                  )}
                >
                  <span className="relative flex shrink-0 items-center justify-center" style={{ width: 14, height: 14 }}>
                    {step.status === "pending" && (
                      <Circle className="h-3 w-3 text-[var(--color-error)]" fill="currentColor" />
                    )}
                    {step.status === "processing" && (
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inset-0 rounded-full bg-[var(--color-warning)] opacity-75 animate-ping" />
                        <span className="relative h-3 w-3 rounded-full bg-[var(--color-warning)]" />
                      </span>
                    )}
                    {step.status === "done" && (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span>{step.label}</span>
                  {step.elapsed != null && (
                    <span className="ml-1 text-[0.7rem] tabular-nums text-[var(--color-muted)]">
                      {formatElapsed(step.elapsed)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {showSoftMessage && (
            <p className="text-sm text-[var(--color-muted)] text-center mt-4">
              {t("wizard.mapping.stillMatching")}
            </p>
          )}

          {showManualButton && runId && targetFields.length > 0 ? (
            <div className="absolute right-4 bottom-4">
              <Dialog open={manualConfirmOpen} onOpenChange={setManualConfirmOpen}>
                <DialogTrigger render={
                  <Button variant="outline" size="sm">
                    {t("wizard.mapping.continueManually")}
                  </Button>
                } />
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("wizard.mapping.manualMappingTitle")}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-[var(--color-muted)]">
                    {t("wizard.mapping.manualMappingDesc")}
                  </p>
                  <div className="mt-4 flex justify-end gap-3">
                    <Button variant="outline" size="sm" onClick={() => setManualConfirmOpen(false)}>
                      {t("wizard.mapping.keepWaiting")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setMappings(
                          targetFields.map((field) => ({
                            targetPath: field.path,
                            sourceColumn: null,
                            confidence: 0,
                            transform: "none",
                            reason: "",
                            constantValue: null,
                          })),
                        );
                        setManualConfirmOpen(false);
                        setShowSoftMessage(false);
                        setShowManualButton(false);
                        setPhase("review");
                      }}
                    >
                      {t("wizard.mapping.continueManually")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-[600px] flex-1 flex-col items-center justify-center gap-6 px-1">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(176,0,32,0.08)]">
            <X className="h-8 w-8 text-[var(--color-error)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-ink)]">{t("wizard.mapping.setupFailed")}</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{errorMessage}</p>
        </div>

        {missingFieldsInfo ? (
          <div className="w-full rounded-xl border border-[rgba(176,0,32,0.15)] bg-[rgba(176,0,32,0.04)] p-5">
            <h4 className="text-sm font-semibold text-[var(--color-error)]">{t("wizard.mapping.missingFields")}</h4>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {t("wizard.mapping.missingFieldsDesc")}
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
                  {t("wizard.mapping.headerDetection", { confidence: String(Math.round(missingFieldsInfo.detection.confidence * 100)), ambiguous: missingFieldsInfo.detection.ambiguous ? t("wizard.mapping.ambiguous") : "" })}
                  &nbsp;&middot; {t("wizard.mapping.headerRow", { row: String(missingFieldsInfo.detection.headerRowIndex + 1) })}
                </p>
                {missingFieldsInfo.detection.matchedFields.length > 0 ? (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {t(missingFieldsInfo.detection.matchedFields.length === 1 ? "wizard.mapping.fieldsMatched" : "wizard.mapping.fieldsMatchedPlural", { count: String(missingFieldsInfo.detection.matchedFields.length), names: missingFieldsInfo.detection.matchedFields.map((f) => f.headerName).join(", ") })}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack}>{t("wizard.mapping.backToUpload")}</Button>
          <Button onClick={() => { setPhase("init"); setErrorMessage(null); setMissingFieldsInfo(null); setWarningMessage(null); setActivitySteps(getDefaultActivitySteps(t)); setCompletedStepIds(new Set()); stepStartTimes.current.clear(); processStartTimeRef.current = 0; retriggerCooldownRef.current = 0; setRetriggerCooldown(0); setHeuristicComplete(false); }}>
            {t("wizard.mapping.retry")}
          </Button>
          {runId && targetFields.length > 0 ? (
            <Button
              variant="secondary"
              onClick={() => {
                setMappings(
                  targetFields.map((field) => ({
                    targetPath: field.path,
                    sourceColumn: null,
                    confidence: 0,
                    transform: "none",
                    reason: "",
                    constantValue: null,
                  })),
                );
                setPhase("review");
                setErrorMessage(null);
              }}
            >
              {t("wizard.mapping.mapManually")}
            </Button>
          ) : null}
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
            {phase === "confirming" ? t("wizard.mapping.savingMappings") : t("wizard.mapping.generatingOutput")}
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

        <aside className="flex min-h-0 w-full shrink-0 flex-col gap-4 xl:w-[300px]">
          <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] p-6">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="rounded-full">{t("wizard.mapping.readiness")}</Badge>
              {isReady ? (
                <Check className="h-4 w-4 text-[var(--color-success)]" />
              ) : null}
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-muted)]">{t("wizard.mapping.requiredMapped")}</span>
                <span className="font-semibold">
                  {totalFields - blockingUnmapped}/{totalFields}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-muted)]">{t("wizard.mapping.reviewRecommended")}</span>
                <span className={clsx("font-semibold", needsReviewCount > 0 && "text-[var(--color-warning)]")}>
                  {needsReviewCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-muted)]">{t("wizard.mapping.unmapped")}</span>
                <span className={clsx("font-semibold", unmappedCount > 0 && "text-[var(--color-error)]")}>
                  {unmappedCount}
                </span>
              </div>
            </div>

            {blockingUnmapped > 0 ? (
              <div className="mt-4 rounded-xl border border-[rgba(176,0,32,0.15)] bg-[rgba(176,0,32,0.04)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-error)]">
                  <AlertTriangle className="h-4 w-4" />
                  {t(blockingUnmapped === 1 ? "wizard.mapping.blockingIssue" : "wizard.mapping.blockingIssues", { count: String(blockingUnmapped) })}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  {t("wizard.mapping.blockingDesc")}
                </p>
              </div>
            ) : mappings.length > 0 ? (
              <div className="mt-4 rounded-xl border border-[rgba(45,106,79,0.15)] bg-[rgba(45,106,79,0.04)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-success)]">
                  <Check className="h-4 w-4" />
                  {t("wizard.mapping.allMet")}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] p-6">
            <Badge variant="outline" className="rounded-full">{t("wizard.mapping.actions")}</Badge>

            <Dialog open={retriggerConfirmOpen} onOpenChange={setRetriggerConfirmOpen}>
              <DialogTrigger render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-xl whitespace-nowrap"
                  disabled={isBusy || retriggerCooldown > 0 || heuristicComplete}
                >
                  <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
                  {heuristicComplete
                    ? t("wizard.mapping.retriggerDisabled")
                    : retriggerCooldown > 0
                      ? t("wizard.mapping.retriggerCooldown", { seconds: String(retriggerCooldown) })
                      : t("wizard.mapping.retriggerAuto")}
                </Button>
              } />
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t("wizard.mapping.retriggerTitle")}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-[var(--color-muted)]">
                  {t("wizard.mapping.retriggerDesc")}
                </p>
                <div className="mt-4 flex justify-end gap-3">
                  <Button variant="outline" size="sm" onClick={() => setRetriggerConfirmOpen(false)}>
                    {t("wizard.mapping.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setRetriggerConfirmOpen(false);
                      handleRetriggerAutoMapping();
                    }}
                  >
                    {t("wizard.mapping.yesRerun")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger render={<Button variant="outline" className="w-full justify-start rounded-xl" size="sm" />}>
                <Eye className="mr-2 h-4 w-4" />
                {t("wizard.mapping.previewJson")}
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle>{t("wizard.mapping.outputPreview")}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh] rounded-xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-4 overflow-x-auto">
                  <pre className="m-0 text-[0.72rem] leading-relaxed text-[var(--color-ink)] whitespace-pre">
                    {mappings.length > 0 ? jsonPreviewFromMappings(mappings) : t("wizard.mapping.noMappingsYet")}
                  </pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start rounded-xl"
              onClick={() => {
                setMappings(
                  mappings.map((mapping) => {
                    const field = targetFields.find((item) => item.path === mapping.targetPath);
                    if (field?.type !== "string" || !mapping.sourceColumn) {
                      return mapping;
                    }
                    return { ...mapping, transform: "trim" };
                  }),
                );
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("wizard.mapping.applyTrim")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start rounded-xl"
              onClick={() => {
                setMappings(
                  targetFields.map((field) => ({
                    targetPath: field.path,
                    sourceColumn: null,
                    confidence: 0,
                    transform: "none",
                    reason: "",
                    constantValue: null,
                  })),
                );
              }}
            >
              <X className="mr-2 h-4 w-4" />
              {t("wizard.mapping.resetSuggestions")}
            </Button>
          </div>
        </aside>
      </div>

      <WizardFooter
        statusText={
          phase === "review" && isReady
            ? t("wizard.mapping.statusAllMapped")
            : phase === "review" && !isReady
              ? t(blockingUnmapped === 1 ? "wizard.mapping.statusFieldsUnmapped" : "wizard.mapping.statusFieldsUnmappedPlural", { count: String(blockingUnmapped) })
              : phase === "confirming"
                ? t("wizard.mapping.statusConfirming")
                : phase === "output"
                  ? t("wizard.mapping.statusGenerating")
                  : t("wizard.mapping.statusProcessing")
        }
        statusReady={isReady}
        primaryLabel={
          phase === "confirming" || phase === "output"
            ? t("wizard.mapping.primaryProcessing")
            : isReady
              ? t("wizard.mapping.primaryConfirm")
              : t("wizard.mapping.primaryReview")
        }
        onPrimary={handleConfirm}
        primaryDisabled={!isReady || isBusy}
        secondaryLabel={t("wizard.mapping.back")}
        onSecondary={handleBack}
      />
    </div>
  );
}
