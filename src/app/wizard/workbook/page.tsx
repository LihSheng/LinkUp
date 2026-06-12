"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

const ALLOWED_TYPES = [".xlsx", ".xls", ".csv"];
const ALLOWED_LABEL = ".xlsx, .xls, .csv";
const MAX_SIZE = 50 * 1024 * 1024;

type PageState = "idle" | "uploading" | "success" | "error";
type UploadPanelTab = "general" | "data-preview" | "profiles";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const initialSheet = searchParams.get("sheet");
  const templateId = searchParams.get("templateId");
  const runId = searchParams.get("runId");
  const { completeStep, isStepAccessible } = useWizardProgress();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pageState, setPageState] = useState<PageState>("idle");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoredUploadId, setRestoredUploadId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<UploadPanelTab>("general");
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
        setActivePanelTab("general");
        setVisibleSampleRowCount(5);
        setRestoredUploadId(uploadId);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setUploadedFile(null);
        setPreview(null);
        setFileSize(0);
        setError(err instanceof Error ? err.message : "Unable to restore uploaded file.");
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
  }, [pageState, restoredUploadId, uploadId, uploadedFile, initialSheet]);

  const uploadFile = useCallback(
    async (file: File) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;

      if (!ALLOWED_TYPES.includes(ext)) {
        setError("Unsupported file type.");
        setPageState("error");
        return;
      }

      if (file.size > MAX_SIZE) {
        setError("File is too large (max 50 MB).");
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
        setActivePanelTab("general");
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
    [router, templateId, runId],
  );

  const handleRemove = useCallback(() => {
    setUploadedFile(null);
    setPreview(null);
    setSelectedSheetName(null);
    setFileSize(0);
    setPageState("idle");
    setError(null);
    setRestoredUploadId(null);
    setActivePanelTab("general");
    setVisibleSampleRowCount(5);
    const params = new URLSearchParams();
    if (templateId) params.set("templateId", templateId);
    if (runId) params.set("runId", runId);
    router.replace(`/wizard/workbook?${params.toString()}`);
  }, [router, templateId, runId]);

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
        setActivePanelTab("data-preview");
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
                onClick={() => setActivePanelTab("general")}
                className={clsx(
                  "rounded-full px-4",
                  activePanelTab === "general" && "bg-white text-[var(--color-ink)] shadow-sm",
                )}
                aria-pressed={activePanelTab === "general"}
              >
                General
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setActivePanelTab("data-preview")}
                className={clsx(
                  "rounded-full px-4",
                  activePanelTab === "data-preview" && "bg-white text-[var(--color-ink)] shadow-sm",
                )}
                aria-pressed={activePanelTab === "data-preview"}
              >
                Data Preview
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setActivePanelTab("profiles")}
                className={clsx(
                  "rounded-full px-4",
                  activePanelTab === "profiles" && "bg-white text-[var(--color-ink)] shadow-sm",
                )}
                aria-pressed={activePanelTab === "profiles"}
              >
                Column Profiles
              </Button>
            </div>

            {activePanelTab === "general" ? (
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
                    <p>{formatSize(fileSize)} &middot; Ready</p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleRemove}
                    style={{ color: "var(--color-error)", whiteSpace: "nowrap" }}
                    aria-label={`Remove ${uploadedFile.originalName}`}
                  >
                    Remove file
                  </button>
                </div>

                {preview ? (
                  <>
                    <div>
                      <p className="dashboard-card-kicker" style={{ marginBottom: "8px" }}>
                        Workbook context
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
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="metric-card">
                        <p className="text-3xl font-bold">{preview.sheetNames.length}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
                          Sheets
                        </p>
                      </div>
                      <div className="metric-card">
                        <p className="text-3xl font-bold">{preview.sampleRows.length}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
                          Samples
                        </p>
                      </div>
                      <div className="metric-card">
                        <p className="text-3xl font-bold">{preview.headers.length}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-3">
                          Columns
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : activePanelTab === "data-preview" ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    Header row detected at row {preview ? preview.headerRowIndex + 1 : "-"}.
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
                      Show more rows
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
                        {visibleSampleRows.map((row, rowIndex) => (
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
              </div>
            ) : (
              <div className="min-h-0 flex-1 flex flex-col gap-3 overflow-y-auto">
                <div className="text-sm text-muted-foreground">
                  {columnProfiles.length} column profiles generated from the detected header row.
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
            aria-label={`Upload your file — drag and drop or click to browse. Accepted: ${ALLOWED_LABEL}, max 50 MB`}
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
                <p className="upload-title">Restoring previous upload&hellip;</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                  Loading workbook details
                </p>
              </>
            ) : pageState === "uploading" ? (
              <>
                <p className="upload-title">Uploading&hellip;</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                  Processing your file
                </p>
              </>
            ) : pageState === "error" ? (
              <>
                <p className="upload-title" style={{ color: "var(--color-error)" }}>
                  Upload failed
                </p>
                <p style={{ color: "var(--color-error)", fontSize: "0.9rem" }}>
                  {error ?? "An error occurred."}
                </p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Click or drag a file to try again
                </p>
              </>
            ) : (
              <>
                <p className="upload-title">Drag &amp; drop your file here</p>
                <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
                  or click to browse &middot; {ALLOWED_LABEL} (max 50 MB)
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <WizardFooter
        statusText={
          isRestoring
            ? "Restoring previous upload"
            : pageState === "success"
              ? "Ready to continue"
              : pageState === "error"
                ? error ?? "Upload failed"
                : "Upload your file to continue"
        }
        statusReady={pageState === "success"}
        onPrimary={handleContinue}
        primaryLabel="Next"
        primaryDisabled={!uploadedFile || showBusyState}
        secondaryLabel="Back"
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
