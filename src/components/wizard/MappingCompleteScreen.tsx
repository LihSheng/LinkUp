"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, AlertTriangle, Download, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WizardFooter } from "@/components/wizard/WizardFooter";

type ValidationError = {
  instancePath: string;
  message?: string;
  keyword: string;
  params?: Record<string, unknown>;
};

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
  mappingTemplateId?: string;
};

function getRowIndex(instancePath: string): number | null {
  const match = /^\/(\d+)/.exec(instancePath);
  return match ? Number(match[1]) : null;
}

function getMetrics(output: NonNullable<RunData["output"]>) {
  const rows = Array.isArray(output.jsonOutput) ? output.jsonOutput.length : 0;
  const errorList: ValidationError[] =
    output.errors && Array.isArray(output.errors)
      ? (output.errors as ValidationError[])
      : [];
  const errorCount = errorList.length;
  const valid = errorCount === 0;
  const rowsWithErrors = new Set<number>();
  for (const err of errorList) {
    const rowIdx = getRowIndex(err.instancePath);
    if (rowIdx !== null) rowsWithErrors.add(rowIdx);
  }
  const passedRows = rows - rowsWithErrors.size;
  const validationRate = rows > 0
    ? Math.max(0, Math.round((passedRows / rows) * 100))
    : 100;
  return { rows, errorCount, valid, rowsWithErrors, validationRate };
}

function getErrorList(output: NonNullable<RunData["output"]>): ValidationError[] {
  if (!output.errors || !Array.isArray(output.errors)) return [];
  return output.errors as ValidationError[];
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
  mappingTemplateId,
}: MappingCompleteScreenProps) {
  const { t } = useTranslation();
  const output = runData.output;
  const metrics = output ? getMetrics(output) : { rows: 0, errorCount: 0, valid: true, rowsWithErrors: new Set<number>(), validationRate: 100 };
  const errors = output ? getErrorList(output) : [];
  const fileName = runData.uploadedFile?.originalName ?? "mapped-data";
  const [showErrors, setShowErrors] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

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

  const handleToggleFavorite = useCallback(async () => {
    if (!mappingTemplateId) return;

    setIsTogglingFavorite(true);
    const nextValue = !isFavorite;

    try {
      const res = await fetch(`/api/mapping-templates/${mappingTemplateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error ?? t("wizard.output.favUpdateFailed"));
      }

      setIsFavorite(nextValue);
    } catch {
      // ignore toggle failures silently
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [mappingTemplateId, isFavorite, t]);

  const jsonPreview =
    output?.jsonOutput && Array.isArray(output.jsonOutput)
      ? JSON.stringify(output.jsonOutput, null, 2)
      : JSON.stringify(output?.jsonOutput ?? null, null, 2);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 gap-6 overflow-hidden px-4">
        {/* Left: JSON preview */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {/* Completion status banner */}
          <div className={metrics.valid
            ? "rounded-xl border border-[rgba(45,106,79,0.2)] bg-[rgba(45,106,79,0.06)] px-6 py-5"
            : "rounded-xl border border-[rgba(255,214,102,0.3)] bg-[rgba(255,214,102,0.06)] px-6 py-5"
          }>
            <div className="flex items-center gap-3">
              <div className={metrics.valid
                ? "flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(45,106,79,0.12)]"
                : "flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(255,214,102,0.15)]"
              }>
                {metrics.valid ? (
                  <Check className="h-5 w-5 text-[var(--color-success)]" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                  {metrics.valid ? t("wizard.output.statusComplete") : t("wizard.output.statusWarnings")}
                </h3>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {metrics.valid
                    ? t(metrics.rows === 1 ? "wizard.output.recordsValidated" : "wizard.output.recordsValidatedPlural", { count: String(metrics.rows), schema: runData.schemaTemplate?.name ?? t("wizard.output.schemaFallback") })
                    : t(metrics.errorCount === 1 ? "wizard.output.issuesFound" : "wizard.output.issuesFoundPlural", { count: String(metrics.errorCount), rowCount: String(metrics.rows) })}
                </p>
              </div>
            </div>
          </div>

          {/* JSON preview panel */}
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                  {t("wizard.output.outputPreview")}
                </h4>
                <p className="text-xs text-[var(--color-muted)]">
                  {t("wizard.output.outputPreviewDesc")}
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
                  {t("wizard.output.exportJson")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExcelExport}
                  disabled={!output?.jsonOutput}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  {t("wizard.output.exportExcel")}
                </Button>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <pre className="m-0 p-6 font-[var(--font-mono)] text-[0.78rem] leading-relaxed text-[var(--color-ink)] whitespace-pre">
                {jsonPreview}
              </pre>
            </ScrollArea>
          </div>

          {/* Error details */}
          {errors.length > 0 ? (
            <div className="rounded-xl border border-[rgba(255,214,102,0.3)] bg-[rgba(255,214,102,0.04)]">
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-4 text-left"
                onClick={() => setShowErrors(!showErrors)}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                  <span className="text-sm font-semibold text-[var(--color-ink)]">
                    {t(errors.length === 1 ? "wizard.output.validationIssue" : "wizard.output.validationIssues", { count: String(errors.length) })}
                  </span>
                </div>
                {showErrors ? (
                  <ChevronUp className="h-4 w-4 text-[var(--color-muted)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
                )}
              </button>
              {showErrors ? (
                <div className="border-t border-[rgba(255,214,102,0.2)] px-6 pb-4 pt-3">
                  <div className="max-h-[200px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-border)] [&::-webkit-scrollbar-track]:bg-transparent">
                    <div className="space-y-2">
                      {errors.map((err, i) => (
                        <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[rgba(252,251,248,0.7)] px-3 py-2">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 rounded bg-[rgba(255,214,102,0.2)] px-1.5 py-0.5 text-[0.65rem] font-medium text-[var(--color-warning)]">
                              {err.keyword}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[0.75rem] text-[var(--color-ink)]">
                                {err.message ?? t("errors.validation")}
                              </p>
                              <p className="mt-0.5 text-[0.65rem] text-[var(--color-muted)]">
                                {err.instancePath || "/"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Right: operational panel */}
        <div className="flex w-[300px] shrink-0 flex-col gap-4 max-xl:hidden">
          {/* Summary metrics */}
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t("wizard.output.summary")}
            </span>
            <div>
              <div className="text-2xl font-semibold text-[var(--color-ink)]">
                {metrics.rows.toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">{t("wizard.output.rowsProcessed")}</div>
            </div>
            <div>
              <div className={`text-2xl font-semibold ${metrics.valid ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>
                {metrics.validationRate}%
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">{t("wizard.output.validationRate")}</div>
            </div>
            <div>
              <div className={`text-2xl font-semibold ${metrics.errorCount > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-ink)]"}`}>
                {metrics.errorCount}
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">{metrics.errorCount === 1 ? t("wizard.output.error") : t("wizard.output.errors")}</div>
            </div>
          </div>

          {/* Export actions */}
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t("wizard.output.export")}
            </span>
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl"
              onClick={handleJsonExport}
              disabled={!output?.jsonOutput}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("wizard.output.downloadJson")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start rounded-xl"
              onClick={handleExcelExport}
              disabled={!output?.jsonOutput}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("wizard.output.downloadExcel")}
            </Button>
          </div>

          {/* File info */}
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.9)] p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {t("wizard.output.details")}
            </span>
            <div>
              <div className="text-xs text-[var(--color-muted)]">{t("wizard.output.sourceFile")}</div>
              <div className="text-sm text-[var(--color-ink)] truncate">{fileName}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted)]">{t("wizard.output.schema")}</div>
              <div className="text-sm text-[var(--color-ink)]">{runData.schemaTemplate?.name ?? "\u2014"}</div>
            </div>
          </div>
        </div>
      </div>

      <WizardFooter
        statusText={metrics.valid ? t("wizard.output.statusFinalized") : t("wizard.output.statusWarnings")}
        statusReady={true}
        primaryLabel={t("wizard.output.finish")}
        onPrimary={onFinish}
        secondaryLabel={t("wizard.output.backToMapping")}
        onSecondary={onBack}
        leftSlot={
          mappingTemplateId ? (
            <button
              type="button"
              className="relative group flex items-center justify-center size-10 rounded-full border border-[var(--color-border)] bg-transparent cursor-pointer hover:bg-[rgba(28,28,28,0.04)] disabled:opacity-50"
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              aria-label={isFavorite ? t("wizard.output.favRemove") : t("wizard.output.favMark")}
            >
              <svg
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="1.8"
                className={isFavorite ? "text-[var(--color-warning)]" : "text-[var(--color-muted)]"}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--color-ink)] text-[var(--color-on-ink)] text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {isFavorite ? t("wizard.output.favRemove") : t("wizard.output.favMark")}
              </span>
            </button>
          ) : null
        }
      />
    </div>
  );
}
