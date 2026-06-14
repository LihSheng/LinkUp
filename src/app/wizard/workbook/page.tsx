"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Eye, EyeOff, Shield } from "lucide-react";
import clsx from "clsx";

import { useWizardProgress } from "@/components/wizard/WizardProgressContext";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { maskCellValue } from "@/lib/masking/cell-masker";

const ALLOWED_TYPES = [".xlsx", ".xls", ".csv"];
const ALLOWED_LABEL = ".xlsx, .xls, .csv";
const MAX_SIZE = 50 * 1024 * 1024;

type PageState = "idle" | "uploading" | "success" | "error";
type UploadPanelTab = "overview" | "data-preview" | "profiles";

type UploadedFileState = {
  id: string;
  originalName: string;
  storagePath: string;
  workbookMeta: Record<string, unknown> | null;
};

type PreviewState = {
  sourceSheetName: string;
  sheetNames: string[];
  headerRowIndex: number;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  columnProfiles: {
    name: string;
    index: number;
    detectedType: string;
    samples: unknown[];
    nullRate: number;
    uniqueCount?: number;
  }[];
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function WorkbookStepPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const initialSheet = searchParams.get("sheet");
  const templateId = searchParams.get("templateId");
  const runId = searchParams.get("runId");
  const { completeStep, isStepAccessible, setActiveRunId } = useWizardProgress();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pageState, setPageState] = useState<PageState>("idle");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoredUploadId, setRestoredUploadId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<UploadPanelTab>("overview");
  const [showMaskedPreview, setShowMaskedPreview] = useState(false);
  const [visibleSampleRowCount, setVisibleSampleRowCount] = useState(5);
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(null);

  useEffect(() => {
    if (!isStepAccessible(1)) {
      router.replace("/wizard/schema");
    }
  }, [isStepAccessible, router]);

  useEffect(() => {
    if (!uploadId || uploadedFile || pageState === "uploading" || restoredUploadId === uploadId) {
      return;
    }

    let cancelled = false;

    async function restoreUpload() {
      setIsRestoring(true);

      try {
        const restoreUrl = initialSheet
          ? `/api/uploads/${uploadId}?sheet=${encodeURIComponent(initialSheet)}`
          : `/api/uploads/${uploadId}`;
        const response = await fetch(restoreUrl);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to restore uploaded file.");
        }

        if (cancelled) {
          return;
        }

        setUploadedFile(data.uploadedFile);
        setPreview(data.preview);
        setSelectedSheetName(data.preview?.sourceSheetName ?? null);
        setFileSize(
          typeof data.uploadedFile?.workbookMeta?.fileSize === "number"
            ? data.uploadedFile.workbookMeta.fileSize
            : 0,
        );
        setError(null);
        setPageState("success");
        setActivePanelTab("overview");
        setShowMaskedPreview(false);
        setVisibleSampleRowCount(5);
        setRestoredUploadId(uploadId);
        if (runId) {
          setActiveRunId(runId);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setUploadedFile(null);
        setPreview(null);
        setFileSize(0);
        setError(err instanceof Error ? err.message : t("errors.restoreFailed"));
        setPageState("error");
        setRestoredUploadId(uploadId);
      } finally {
        if (!cancelled) {
          setIsRestoring(false);
        }
      }
    }

    void restoreUpload();

    return () => {
      cancelled = true;
    };
  }, [pageState, restoredUploadId, uploadId, uploadedFile, initialSheet, runId, setActiveRunId, t]);

  const uploadFile = useCallback(
    async (file: File) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;

      if (!ALLOWED_TYPES.includes(ext)) {
        setError(t("wizard.workbook.unsupportedType"));
        setPageState("error");
        return;
      }

      if (file.size > MAX_SIZE) {
        setError(t("wizard.workbook.fileTooLarge"));
        setPageState("error");
        return;
      }

      setPageState("uploading");
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Upload failed.");
        }

        setUploadedFile(data.uploadedFile);
        setPreview(data.preview);
        setSelectedSheetName(data.preview?.sourceSheetName ?? null);
        setFileSize(
          typeof data.uploadedFile?.workbookMeta?.fileSize === "number"
            ? data.uploadedFile.workbookMeta.fileSize
            : file.size,
        );
        setPageState("success");
        setActivePanelTab("overview");
        setShowMaskedPreview(false);
        setVisibleSampleRowCount(5);

        if (runId) {
          await fetch(`/api/mapping-runs/${runId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadedFileId: data.uploadedFile.id,
              sourceSheetName: data.preview?.sourceSheetName ?? null,
            }),
          });
          setActiveRunId(runId);
        }

        const replaceParams = new URLSearchParams({ uploadId: data.uploadedFile.id });
        if (templateId) replaceParams.set("templateId", templateId);
        if (runId) replaceParams.set("runId", runId);
        router.replace(`/wizard/workbook?${replaceParams.toString()}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setPageState("error");
      }
    },
    [router, templateId, runId, setActiveRunId, t],
  );

  const handleRemove = useCallback(() => {
    setUploadedFile(null);
    setPreview(null);
    setSelectedSheetName(null);
    setFileSize(0);
    setPageState("idle");
    setError(null);
    setRestoredUploadId(uploadId);
    setIsRestoring(false);
    setActivePanelTab("overview");
    setShowMaskedPreview(false);
    setVisibleSampleRowCount(5);
    const params = new URLSearchParams();
    if (templateId) params.set("templateId", templateId);
    if (runId) params.set("runId", runId);
    router.replace(`/wizard/workbook?${params.toString()}`);
  }, [router, templateId, runId, uploadId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        void uploadFile(file);
      }
    },
    [uploadFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void uploadFile(file);
        e.target.value = "";
      }
    },
    [uploadFile],
  );

  const handleSelectSheet = useCallback(
    async (sheetName: string) => {
      if (!uploadedFile || sheetName === selectedSheetName) return;

      try {
        const response = await fetch(
          `/api/uploads/${uploadedFile.id}?sheet=${encodeURIComponent(sheetName)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load sheet preview.");
        }

        setPreview(data.preview);
        setSelectedSheetName(sheetName);
        setVisibleSampleRowCount(5);
      } catch (err) {
        toast.error("Failed to load sheet", {
          description: err instanceof Error ? err.message : "Unable to load sheet preview.",
        });
      }
    },
    [uploadedFile, selectedSheetName],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  const handleContinue = useCallback(() => {
    if (!uploadedFile) {
      setError("A file upload is required.");
      return;
    }

    const params = new URLSearchParams({ uploadId: uploadedFile.id });
    if (selectedSheetName) {
      params.set("sheet", selectedSheetName);
    }
    if (templateId) {
      params.set("templateId", templateId);
    }
    if (runId) {
      params.set("runId", runId);
    }

    completeStep(1);
    router.push(`/wizard/mapping?${params.toString()}`);
  }, [completeStep, router, uploadedFile, selectedSheetName, templateId, runId]);

  const visibleSampleRows = preview?.sampleRows.slice(0, visibleSampleRowCount) ?? [];
  const columnProfiles = preview?.columnProfiles ?? [];
  const previewHeaders = preview?.headers ?? [];
  const showBusyState = pageState === "uploading" || isRestoring;
  const profileSummary = columnProfiles.slice(0, 4);
  const displayedSampleRows = showMaskedPreview
    ? visibleSampleRows.map((row) =>
        Object.fromEntries(
          previewHeaders.map((header) => [header, maskCellValue(row[header])]),
        ),
      )
    : visibleSampleRows;

  return (
    <div className="wizard-step-page">
      <section className="wizard-panel" style={{ flex: "1 1 auto" }}>
        {pageState === "success" && uploadedFile ? (
          <div className="flex min-h-0 w-full flex-1 flex-col max-w-full min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[rgba(252,251,248,0.7)] p-[18px_20px]">
            <div className="mb-2 inline-flex w-fit rounded-full bg-[rgba(28,28,28,0.05)] p-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setActivePanelTab("overview")}
                className={clsx(
                  "rounded-full px-4",
                  activePanelTab === "overview" && "bg-[var(--surface-panel)] text-[var(--color-ink)] shadow-sm",
                )}
                aria-pressed={activePanelTab === "overview"}
              >
                {t("wizard.workbook.overview")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setActivePanelTab("data-preview")}
                className={clsx(
                  "rounded-full px-4",
                  activePanelTab === "data-preview" && "bg-[var(--surface-panel)] text-[var(--color-ink)] shadow-sm",
                )}
                aria-pressed={activePanelTab === "data-preview"}
              >
                {t("wizard.workbook.sheetPreview")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setActivePanelTab("profiles")}
                className={clsx(
                  "rounded-full px-4",
                  activePanelTab === "profiles" && "bg-[var(--surface-panel)] text-[var(--color-ink)] shadow-sm",
                )}
                aria-pressed={activePanelTab === "profiles"}
              >
                {t("wizard.workbook.columnProfiles")}
              </Button>
            </div>

            {activePanelTab === "overview" ? (
              <div className="space-y-4">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{uploadedFile.originalName}</strong>
                    <p>{formatSize(fileSize)} &middot; {t("wizard.workbook.ready")}</p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleRemove}
                    style={{ color: "var(--color-error)", whiteSpace: "nowrap" }}
                    aria-label={t("wizard.workbook.removeLabel", { name: uploadedFile.originalName })}
                  >
                    {t("wizard.workbook.removeFile")}
                  </button>
                </div>

                {preview ? (
                  <>
                    <div>
                      <p className="dashboard-card-kicker" style={{ marginBottom: "8px" }}>
                        {t("wizard.workbook.workbookSummary")}
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {preview.sheetNames.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className={clsx(
                              "sheet-pill",
                              name === selectedSheetName && "sheet-pill-active",
                            )}
                            onClick={() => handleSelectSheet(name)}
                            style={{
                              padding: "4px 14px",
                              borderRadius: "var(--radius-full)",
                              fontSize: "0.85rem",
                              lineHeight: "1.6",
                              cursor: name === selectedSheetName ? "default" : "pointer",
                            }}
                          >
                            {name}
                            {name === selectedSheetName ? " \u2713" : ""}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-[var(--color-muted)]">
                          {t("wizard.workbook.sheetSelectionHint")}
                        </p>
                        <div className="inline-flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setActivePanelTab("data-preview")}
                          >
                            {t("wizard.workbook.openPreview")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActivePanelTab("profiles")}
                            className="gap-2"
                          >
                            {t("wizard.workbook.columnProfiles")}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="metric-card">
                        <p className="text-3xl font-bold">{preview.sheetNames.length}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
                          {t("wizard.workbook.sheets")}
                        </p>
                      </div>
                      <div className="metric-card">
                        <p className="text-3xl font-bold">{preview.sampleRows.length}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
                          {t("wizard.workbook.samples")}
                        </p>
                      </div>
                      <div className="metric-card">
                        <p className="text-3xl font-bold">{preview.headers.length}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
                          {t("wizard.workbook.columns")}
                        </p>
                      </div>
                    </div>

                    {profileSummary.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="dashboard-card-kicker">{t("wizard.workbook.profileSummary")}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActivePanelTab("profiles")}
                            className="px-2"
                          >
                            {t("wizard.workbook.viewAllProfiles")}
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {profileSummary.map((col) => (
                            <div
                              key={col.name}
                              className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.55)] p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <strong className="block truncate text-sm">{col.name}</strong>
                                <span className="shrink-0 rounded-full bg-[rgba(28,28,28,0.06)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                                  {col.detectedType}
                                </span>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
                                <span>{t("wizard.workbook.profileNullRate", { value: String(Math.round(col.nullRate * 100)) })}</span>
                                <span>|</span>
                                <span>{t("wizard.workbook.profileUniqueCount", { value: String(col.uniqueCount ?? 0) })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : activePanelTab === "data-preview" ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {t("wizard.workbook.headerRowDetected", { row: String(preview ? preview.headerRowIndex + 1 : "-") })}
                  </div>
                  {preview && preview.sampleRows.length > visibleSampleRowCount ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setVisibleSampleRowCount((current) =>
                          Math.min(current + 5, preview.sampleRows.length),
                        )
                      }
                    >
                      {t("wizard.workbook.showMoreRows")}
                    </Button>
                  ) : null}
                </div>
                {visibleSampleRows.length > 0 ? (
                  <div
                    className="relative max-w-full min-w-0 flex-1 overflow-auto"
                    style={{
                      minHeight: "320px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "rgba(252,251,248,0.55)",
                    }}
                  >
                    <table className="w-full min-w-max text-[0.82rem]">
                      <TableHeader className="sticky top-0 z-10 bg-[rgba(252,251,248,0.96)]">
                        <TableRow>
                          {previewHeaders.map((header) => (
                            <TableHead
                              key={header}
                              className="h-auto min-w-[180px] px-3 py-2 font-semibold text-[var(--color-ink)]"
                            >
                              <span className="block truncate">{header}</span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedSampleRows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {previewHeaders.map((header) => (
                              <TableCell
                                key={header}
                                className="min-w-[180px] px-3 py-2 align-top text-[var(--color-ink)]"
                              >
                                <span className="block truncate">{String(row[header] ?? "")}</span>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </table>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <Shield className="h-3 w-3" />
                    <span>
                      {showMaskedPreview
                        ? t("wizard.workbook.maskedPreviewHint")
                        : t("wizard.mapping.trustStatement")}
                    </span>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.55)] p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowMaskedPreview(false)}
                      className={clsx(
                        "rounded-full px-3 gap-2",
                        !showMaskedPreview && "bg-[var(--surface-panel)] text-[var(--color-ink)] shadow-sm",
                      )}
                      aria-pressed={!showMaskedPreview}
                    >
                      <Eye className="h-4 w-4" />
                      {t("wizard.workbook.unmaskedPreview")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowMaskedPreview(true)}
                      className={clsx(
                        "rounded-full px-3 gap-2",
                        showMaskedPreview && "bg-[var(--surface-panel)] text-[var(--color-ink)] shadow-sm",
                      )}
                      aria-pressed={showMaskedPreview}
                    >
                      <EyeOff className="h-4 w-4" />
                      {t("wizard.workbook.maskedPreview")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 flex flex-col gap-3 overflow-y-auto">
                <div className="text-sm text-muted-foreground">
                  {t("wizard.workbook.columnProfilesGenerated", { count: String(columnProfiles.length) })}
                </div>
                {columnProfiles.length > 0 ? (
                  <div
                    className="min-w-0 rounded-sm border border-[var(--color-border)]"
                  >
                    {columnProfiles.map((col, idx) => (
                      <div
                        key={col.name}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                        style={{
                          borderTop: idx > 0 ? "1px solid var(--color-border)" : "none",
                        }}
                      >
                        <strong
                          className="block truncate"
                          style={{ fontSize: "0.82rem" }}
                        >
                          {col.name}
                        </strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                          {col.detectedType}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div
            className={clsx("upload-zone", isDragging && "is-dragging")}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={t("wizard.workbook.uploadLabel", { types: ALLOWED_LABEL })}
            aria-disabled={showBusyState}
            style={{
              cursor: showBusyState ? "default" : "pointer",
              minHeight: "150px",
              alignContent: "center",
              textAlign: "center",
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden-input"
              onChange={handleFileSelect}
              disabled={showBusyState}
              aria-hidden="true"
            />

            {isRestoring ? (
              <>
                <p className="upload-title">{t("wizard.workbook.restoring")}</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                  {t("wizard.workbook.loadingWorkbook")}
                </p>
              </>
            ) : pageState === "uploading" ? (
              <>
                <p className="upload-title">{t("wizard.workbook.uploading")}</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                  {t("wizard.workbook.processing")}
                </p>
              </>
            ) : pageState === "error" ? (
              <>
                <p className="upload-title" style={{ color: "var(--color-error)" }}>
                  {t("wizard.workbook.uploadFailed")}
                </p>
                <p style={{ color: "var(--color-error)", fontSize: "0.9rem" }}>
                  {error ?? t("wizard.workbook.errorOccurred")}
                </p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                  {t("wizard.workbook.clickOrDrag")}
                </p>
              </>
            ) : (
              <>
                <p className="upload-title">{t("wizard.workbook.dragDrop")}</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                  {t("wizard.workbook.orClickToBrowse", { types: ALLOWED_LABEL })}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <WizardFooter
        statusText={
          isRestoring
            ? t("wizard.workbook.statusRestoring")
            : pageState === "success"
              ? t("wizard.workbook.statusReady")
              : pageState === "error"
                ? error ?? t("wizard.workbook.uploadError")
                : t("wizard.workbook.statusUpload")
        }
        statusReady={pageState === "success"}
        onPrimary={handleContinue}
        primaryLabel={t("wizard.workbook.next")}
        primaryDisabled={!uploadedFile || showBusyState}
        secondaryLabel={t("wizard.workbook.back")}
        onSecondary={() => {
          const params = new URLSearchParams();
          if (templateId) params.set("templateId", templateId);
          if (runId) params.set("runId", runId);
          router.push(`/wizard/schema?${params.toString()}`);
        }}
      />
    </div>
  );
}
