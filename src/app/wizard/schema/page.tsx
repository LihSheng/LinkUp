"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { useWizardProgress } from "@/components/wizard/WizardProgressContext";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

import { CreateTemplateModal } from "./CreateTemplateModal";

type SchemaTemplate = {
  id: string;
  name: string;
  description?: string | null;
  jsonSchema: unknown;
};

type MappingTemplateItem = {
  id: string;
  name: string;
  schemaTemplateId: string;
  sourceSignature?: string | null;
  confirmedMapping: unknown;
  isFavorite: boolean;
};

type TemplateListResponse = {
  templates?: SchemaTemplate[];
};

type TemplateCreateResponse = {
  template: SchemaTemplate;
};

type CreateRunResponse = {
  run: {
    id: string;
    draftToken: string;
  };
};

type MappingTemplatesResponse = {
  templates: MappingTemplateItem[];
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data = {} as T & { error?: string };

  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      if (!response.ok) {
        throw new Error(text);
      }

      throw new Error("Received an invalid JSON response from the server.");
    }
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

const swrFetcher = async (url: string) => readJson<TemplateListResponse>(await fetch(url));

export default function SchemaStepPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingRunId = searchParams.get("runId");
  const existingTemplateId = searchParams.get("templateId");
  const { completeStep, resetProgress } = useWizardProgress();

  useEffect(() => {
    if (!existingRunId) {
      resetProgress();
    }
  }, [resetProgress, existingRunId]);
  const [selected, setSelected] = useState<string | null>(existingTemplateId ?? null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectedTemplateId, setInspectedTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SchemaTemplate | null>(null);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<SchemaTemplate | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  const [selectedFavoriteTemplateId, setSelectedFavoriteTemplateId] = useState<string | null>(null);
  const [processName, setProcessName] = useState("");
  const [triedContinue, setTriedContinue] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  useEffect(() => {
    if (!existingRunId) return;

    let cancelled = false;

    async function restoreDraft() {
      try {
        const res = await fetch(`/api/mapping-runs/${existingRunId}`);
        const data = await res.json();

        if (!cancelled && data?.run?.displayName) {
          setProcessName(data.run.displayName);
        }
      } catch {
        // ignore restore failures
      }
    }

    void restoreDraft();

    return () => {
      cancelled = true;
    };
  }, [existingRunId]);

  const { data, mutate, isLoading, error } = useSWR("/api/schema-templates", swrFetcher, {
    revalidateOnFocus: false,
  });

  const templates = useMemo(() => data?.templates ?? [], [data?.templates]);
  const selectedTemplate = selected
    ? templates.find((template) => template.id === selected) ?? null
    : null;
  const inspectedTemplate = useMemo(
    () => templates.find((template) => template.id === inspectedTemplateId) ?? null,
    [inspectedTemplateId, templates],
  );

  const { data: mappingTemplatesData } = useSWR<MappingTemplatesResponse>(
    selectedTemplate ? `/api/schema-templates/${selectedTemplate.id}/templates` : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false },
  );

  const mappingTemplates = useMemo(
    () => mappingTemplatesData?.templates ?? [],
    [mappingTemplatesData],
  );

  const favoriteTemplates = useMemo(
    () => mappingTemplates.filter((t) => t.isFavorite),
    [mappingTemplates],
  );

  async function handleCreateTemplate(payload: {
    name: string;
    description?: string;
    jsonSchema: unknown;
  }) {
    const result = await readJson<TemplateCreateResponse>(
      await fetch("/api/schema-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );

    await mutate(
      (current: unknown) => {
        const existing = (current as TemplateListResponse | undefined)?.templates ?? [];
        return {
          templates: [
            result.template,
            ...existing.filter((template) => template.id !== result.template.id),
          ],
        };
      },
      { revalidate: false },
    );

    setSelected(result.template.id);
    toast.success("Template created", {
      description: `"${result.template.name}" was saved.`,
    });
  }

  async function handleUpdateTemplate(
    templateId: string,
    payload: {
      name: string;
      description?: string;
      jsonSchema: unknown;
    },
  ) {
    const result = await readJson<TemplateCreateResponse>(
      await fetch(`/api/schema-templates/${templateId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );

    await mutate(
      (current: unknown) => {
        const existing = (current as TemplateListResponse | undefined)?.templates ?? [];
        return {
          templates: [
            result.template,
            ...existing.filter((template) => template.id !== result.template.id),
          ],
        };
      },
      { revalidate: false },
    );

    setSelected(result.template.id);
    toast.success("Template updated", {
      description: `"${result.template.name}" was updated.`,
    });
  }

  async function handleDeleteTemplate(templateId: string) {
    const result = await readJson<{ template: SchemaTemplate }>(
      await fetch(`/api/schema-templates/${templateId}`, {
        method: "DELETE",
      }),
    );

    await mutate(
      (current: unknown) => {
        const existing = (current as TemplateListResponse | undefined)?.templates ?? [];
        return {
          templates: existing.filter((item) => item.id !== templateId),
        };
      },
      { revalidate: false },
    );

    return result.template;
  }

  async function handleConfirmDelete() {
    const template = templatePendingDelete;

    if (!template) {
      return;
    }

    setIsDeletingTemplate(true);

    try {
      const deletedTemplate = await handleDeleteTemplate(template.id);

      if (selected === template.id) {
        setSelected((current) =>
          current === template.id
            ? templates.find((item) => item.id !== template.id)?.id ?? null
            : current,
        );
      }

      setInspectedTemplateId((current) => (current === template.id ? null : current));
      setEditingTemplate((current) => (current?.id === template.id ? null : current));

      toast.success("Template deleted", {
        description: `"${deletedTemplate.name}" was deleted.`,
      });
    } catch (error) {
      toast.error("Template not deleted", {
        description: error instanceof Error ? error.message : "Unable to delete template.",
      });
    } finally {
      setIsDeletingTemplate(false);
      setTemplatePendingDelete(null);
    }
  }

  const isUsingFavorite = selectedFavoriteTemplateId !== null;
  const isUsingNewProcess = selectedTemplate !== null && !isUsingFavorite;
  const processNameValid = processName.trim().length > 0;
  const canContinue = isUsingFavorite || (isUsingNewProcess && processNameValid);

  const finalDisplayName = isUsingFavorite
    ? favoriteTemplates.find((t) => t.id === selectedFavoriteTemplateId)?.name ?? processName.trim()
    : processName.trim();

  const getStatusText = () => {
    if (isUsingFavorite) {
      const favTemplate = favoriteTemplates.find((t) => t.id === selectedFavoriteTemplateId);
      return favTemplate ? `Reusing "${favTemplate.name}"` : "Select a schema template to continue";
    }
    if (isUsingNewProcess && processNameValid) {
      return `Starting "${processName.trim()}"`;
    }
    if (selectedTemplate && !isUsingFavorite) {
      return "Enter a process name to continue";
    }
    return "Select a schema template to continue";
  };

  async function handlePrimary() {
    if (!selectedTemplate) {
      toast.error("No template selected", {
        description: "Please select a schema template before continuing.",
      });
      return;
    }

    if (!isUsingFavorite && !processNameValid) {
      setTriedContinue(true);
      toast.error("Process name required", {
        description: "Enter a name for your new process, or select a favorited mapping template.",
      });
      return;
    }

    setTriedContinue(false);

    if (existingRunId) {
      completeStep(0);
      const params = new URLSearchParams({
        templateId: selectedTemplate.id,
        runId: existingRunId,
      });
      if (searchParams.get("draftToken")) {
        params.set("draftToken", searchParams.get("draftToken")!);
      }
      router.push(`/wizard/workbook?${params.toString()}`);
      return;
    }

    setIsCreatingDraft(true);

    try {
      const createResult = await readJson<CreateRunResponse>(
        await fetch("/api/mapping-runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemaTemplateId: selectedTemplate.id,
            displayName: finalDisplayName,
          }),
        }),
      );

      completeStep(0);
      const params = new URLSearchParams({
        templateId: selectedTemplate.id,
        runId: createResult.run.id,
      });
      if (createResult.run.draftToken) {
        params.set("draftToken", createResult.run.draftToken);
      }
      if (isUsingFavorite) {
        params.set("mappingTemplateId", selectedFavoriteTemplateId!);
      }
      router.push(`/wizard/workbook?${params.toString()}`);
    } catch (err) {
      toast.error("Failed to create draft", {
        description: err instanceof Error ? err.message : "Unable to start process.",
      });
    } finally {
      setIsCreatingDraft(false);
    }
  }

  return (
    <div className="wizard-step-page">
      <div className="template-grid">
        {isLoading ? (
          <div className="template-card" style={{ cursor: "default", pointerEvents: "none" }}>
            <Skeleton className="h-5 w-2/3 bg-muted-foreground/15" />
            <Skeleton className="h-4 w-full bg-muted-foreground/15" />
            <Skeleton className="h-4 w-1/2 bg-muted-foreground/15" />
          </div>
        ) : null}

        {error ? (
          <div className="template-card template-card-new" style={{ cursor: "default" }}>
            <h3 className="template-card-title">Template load failed</h3>
            <p className="template-card-desc">{error instanceof Error ? error.message : "Try again."}</p>
          </div>
        ) : null}

        {!isLoading && templates.length === 0 && !error ? (
          <div className="template-card template-card-new" style={{ cursor: "default" }}>
            <h3 className="template-card-title">No templates yet</h3>
          </div>
        ) : null}

        {templates.map((template) => (
          <div
            key={template.id}
            className={`template-card ${selected === template.id ? "is-selected" : ""}`}
            style={{ position: "relative" }}
          >
            <button
              type="button"
              aria-label={`Select ${template.name}`}
              onClick={() => {
                setSelected(template.id);
                setSelectedFavoriteTemplateId(null);
                setProcessName("");
                setTriedContinue(false);
              }}
              style={{
                position: "absolute",
                inset: 0,
                border: 0,
                background: "transparent",
                padding: 0,
                cursor: "pointer",
              }}
            />
            <button
              type="button"
              aria-label={`See details for ${template.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setInspectedTemplateId(template.id);
              }}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "34px",
                height: "34px",
                borderRadius: "9999px",
                border: "1px solid var(--color-border)",
                background: "rgba(252, 251, 248, 0.96)",
                color: "var(--color-ink)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                zIndex: 1,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1.5 12s3.5-7 10.5-7 10.5 7 10.5 7-3.5 7-10.5 7-10.5-7-10.5-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <h3 className="template-card-title">{template.name}</h3>
            <p className="template-card-desc">{template.description ?? "No description yet."}</p>
          </div>
        ))}

        <button
          type="button"
          className="template-card template-card-new"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <div className="template-card-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <h3 className="template-card-title">Add New Template</h3>
          <p className="template-card-desc">Create a new saved schema.</p>
        </button>
      </div>

      {selectedTemplate ? (
        <div className="mt-6 space-y-6 max-w-3xl">
          {favoriteTemplates.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-[0.08em] mb-3">
                Reuse a saved mapping
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {favoriteTemplates.map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      selectedFavoriteTemplateId === fav.id
                        ? "border-[var(--color-ink)] bg-[rgba(28,28,28,0.04)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-ink-30)]"
                    }`}
                    onClick={() => {
                      if (selectedFavoriteTemplateId === fav.id) {
                        setSelectedFavoriteTemplateId(null);
                      } else {
                        setSelectedFavoriteTemplateId(fav.id);
                        setProcessName("");
                        setTriedContinue(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="text-[var(--color-warning)] shrink-0">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="font-medium text-sm">{fav.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-[0.08em] mb-3">
              Start new process
            </h3>
            <label className="grid gap-2">
              <span className="text-sm font-medium">
                Process name {!isUsingFavorite ? <span className="text-[var(--color-error)]">*</span> : null}
              </span>
              <Input
                value={processName}
                onChange={(event) => {
                  setProcessName(event.target.value);
                  setSelectedFavoriteTemplateId(null);
                  setTriedContinue(false);
                }}
                placeholder="e.g. Monthly payroll import Q2 2026"
                disabled={isUsingFavorite}
                className={triedContinue && !processNameValid && !isUsingFavorite ? "border-red-500" : ""}
              />
            </label>
          </section>
        </div>
      ) : null}

      <WizardFooter
        statusText={getStatusText()}
        statusReady={canContinue && !isCreatingDraft}
        primaryLabel={isCreatingDraft ? "Creating draft..." : "Next"}
        onPrimary={handlePrimary}
        primaryDisabled={!canContinue || isCreatingDraft}
      />

      {isCreateModalOpen ? (
        <CreateTemplateModal
          key="create-template"
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreateTemplate={async (payload) => {
            await handleCreateTemplate(payload);
            setIsCreateModalOpen(false);
          }}
        />
      ) : null}

      {editingTemplate ? (
        <CreateTemplateModal
          key={editingTemplate.id}
          isOpen={true}
          initialTemplate={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onCreateTemplate={async (payload) => {
            await handleUpdateTemplate(editingTemplate.id, payload);
            setEditingTemplate(null);
          }}
        />
      ) : null}

      {inspectedTemplate ? (
        <TemplateDetailsModal
          template={inspectedTemplate}
          onEdit={() => {
            setInspectedTemplateId(null);
            setEditingTemplate(inspectedTemplate);
          }}
          onDelete={() => setTemplatePendingDelete(inspectedTemplate)}
          onClose={() => setInspectedTemplateId(null)}
        />
      ) : null}

      <AlertDialog
        open={templatePendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingTemplate) {
            setTemplatePendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              {templatePendingDelete
                ? `This will permanently delete "${templatePendingDelete.name}". This cannot be undone.`
                : "This template will be permanently deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTemplate}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingTemplate}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {isDeletingTemplate ? "Deleting..." : "Delete template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TemplateDetailsModal({
  template,
  onEdit,
  onDelete,
  onClose,
}: {
  template: SchemaTemplate;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onClose: () => void;
}) {
  const fields = flattenJsonSchema(template.jsonSchema);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-32px)] sm:w-[min(1180px,calc(100vw-32px))] sm:min-w-[960px] sm:max-w-[1180px] h-[calc(100vh-32px)] sm:h-[min(860px,calc(100vh-32px))] sm:min-h-[680px] sm:max-h-[calc(100vh-32px)] p-0 gap-0 overflow-hidden rounded-[22px] grid-rows-[auto_1fr]"
      >
        <DialogHeader
          className="px-6 py-[18px] bg-white/66 border-b border-[var(--color-border)] flex flex-row items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)] m-0">
              Saved schema
            </p>
            <DialogTitle className="mt-1.5 text-lg">{template.name}</DialogTitle>
            <DialogDescription className="mt-1.5">
              {template.description ?? "No description yet."}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={onEdit}>
              Edit template
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
            >
              Delete template
            </Button>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Close schema details"
                />
              }
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-[minmax(0,1.05fr)_420px] flex-1 min-h-0">
          <section className="p-6 min-h-0 overflow-auto">
            <div className="flex justify-between items-center gap-3 mb-4">
              <h4 className="m-0 text-sm font-semibold">Columns</h4>
              <span className="text-[var(--color-muted)] text-sm">{fields.length} fields</span>
            </div>

            <div className="border border-[var(--color-border)] rounded-[16px] overflow-hidden">
              <div className="grid grid-cols-[1.4fr_0.6fr_0.4fr] gap-3 px-4 py-3 bg-[rgba(28,28,28,0.03)] text-[var(--color-muted)] text-[0.78rem] uppercase tracking-[0.08em]">
                <span className="min-w-0">Field</span>
                <span className="min-w-0">Type</span>
                <span className="min-w-0">Required</span>
              </div>
              {fields.length > 0 ? (
                fields.map((field) => (
                  <div
                    key={field.path}
                    className="grid grid-cols-[1.4fr_0.6fr_0.4fr] gap-3 px-4 py-3 border-t border-[var(--color-border)]"
                  >
                    <span className="min-w-0 truncate text-[var(--color-ink)]">{field.path}</span>
                    <span className="min-w-0 text-[var(--color-muted)]">{field.type}</span>
                    <span className="min-w-0 text-[var(--color-muted)]">{field.required ? "Yes" : "No"}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-[var(--color-muted)]">No fields found.</div>
              )}
            </div>
          </section>

          <aside className="p-6 border-l border-[var(--color-border)] bg-[rgba(252,251,248,0.98)] min-h-0 overflow-hidden grid gap-3 content-start">
            <h4 className="m-0 text-sm font-semibold">Schema JSON</h4>
            <pre
              className="m-0 p-4 rounded-[14px] bg-[rgba(247,244,237,0.9)] border border-[var(--color-border)] text-[var(--color-ink)] overflow-auto text-[0.82rem] leading-[1.7] whitespace-pre"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            >
              {JSON.stringify(template.jsonSchema, null, 2)}
            </pre>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
