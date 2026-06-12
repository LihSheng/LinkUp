"use client";

import { useCallback } from "react";
import { Check, AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WizardFooter } from "@/components/wizard/WizardFooter";

type RunData = {
  id: string;
  status: string;
  targetFields: Array<{ path: string; type: string; required: boolean }>;
  output: {
    jsonOutput: unknown;
    errors: unknown;
  } | null;
  uploadedFile: {
    originalName: string;
  } | null;
  schemaTemplate: {
    name: string;
  } | null;
};

type MappingCompleteScreenProps = {
  runData: RunData;
  onBack: () => void;
  onFinish: () => void;
};

function getMetrics(output: NonNullable<RunData["output"]>) {
  const rows = Array.isArray(output.jsonOutput) ? output.jsonOutput.length : 0;
  const errorCount =
    output.errors && typeof output.errors === "object"
      ? Array.isArray(output.errors)
        ? output.errors.length
        : Object.keys(output.errors as Record<string, unknown>).length
      : 0;
  const valid = errorCount === 0;
  return { rows, errorCount, valid };
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadExcel(data: unknown, filename: string) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mapped Data");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.json$/i, "") + ".xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function MappingCompleteScreen({
  runData,
  onBack,
  onFinish,
}: MappingCompleteScreenProps) {
  const output = runData.output;
  const metrics = output ? getMetrics(output) : { rows: 0, errorCount: 0, valid: true };
  const fileName = runData.uploadedFile?.originalName ?? "mapped-data";

  const handleJsonExport = useCallback(() => {
    if (!output?.jsonOutput) return;
    const baseName = fileName.replace(/\.[^.]+$/, "");
    downloadJson(output.jsonOutput, `${baseName}-mapped.json`);
  }, [output, fileName]);

  const handleExcelExport = useCallback(() => {
    if (!output?.jsonOutput) return;
    const baseName = fileName.replace(/\.[^.]+$/, "");
    downloadExcel(output.jsonOutput, `${baseName}-mapped.json`);
  }, [output, fileName]);

  const jsonPreview =
    output?.jsonOutput && Array.isArray(output.jsonOutput)
      ? JSON.stringify(output.jsonOutput, null, 2)
      : JSON.stringify(output?.jsonOutput ?? null, null, 2);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-hidden">
      <div className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-6 overflow-hidden px-1">
        {/* Completion status banner */}
        <div className="rounded-xl border border-[rgba(45,106,79,0.2)] bg-[rgba(45,106,79,0.06)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(45,106,79,0.12)]">
              {metrics.valid ? (
                <Check className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                {metrics.valid ? "Mapping complete" : "Completed with warnings"}
              </h3>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                {metrics.valid
                  ? `All ${metrics.rows} record${metrics.rows !== 1 ? "s" : ""} validated successfully against ${runData.schemaTemplate?.name ?? "the schema"}.`
                  : `${metrics.errorCount} validation issue${metrics.errorCount !== 1 ? "s" : ""} found across ${metrics.rows} row${metrics.rows !== 1 ? "s" : ""}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] px-5 py-4">
            <div className="text-2xl font-semibold text-[var(--color-ink)]">
              {metrics.rows.toLocaleString()}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Rows processed
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] px-5 py-4">
            <div className="text-2xl font-semibold text-[var(--color-success)]">
              {metrics.valid ? "100" : `${Math.round(((metrics.rows - metrics.errorCount) / Math.max(metrics.rows, 1)) * 100)}`}%
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Validation
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] px-5 py-4">
            <div
              className={`text-2xl font-semibold ${metrics.errorCount > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-ink)]"}`}
            >
              {metrics.errorCount}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {metrics.errorCount === 1 ? "Error" : "Errors"}
            </div>
          </div>
        </div>

        {/* JSON preview panel */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                Output preview
              </h4>
              <p className="text-xs text-[var(--color-muted)]">
                Read-only view of the finalized mapped data
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleJsonExport}
                disabled={!output?.jsonOutput}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExcelExport}
                disabled={!output?.jsonOutput}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Excel
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <pre className="m-0 p-6 font-[var(--font-mono)] text-[0.78rem] leading-relaxed text-[var(--color-ink)]">
              {jsonPreview}
            </pre>
          </ScrollArea>
        </div>
      </div>

      <WizardFooter
        statusText={metrics.valid ? "Mapping finalized" : "Completed with warnings"}
        statusReady={true}
        primaryLabel="Finish"
        onPrimary={onFinish}
        secondaryLabel="Back to mapping"
        onSecondary={onBack}
      />
    </div>
  );
}
