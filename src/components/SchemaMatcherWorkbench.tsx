"use client";

import { memo, useEffect, useMemo, useState, useTransition } from "react";
import useSWR from "swr";
import clsx from "clsx";

import { flattenJsonSchema } from "@/lib/schema/json-schema";
import type { ColumnProfile, FieldMapping, TargetField } from "@/lib/mapping/mapping.types";

type WorkflowView = "schema" | "workbook" | "mapping" | "output";

type SchemaTemplate = {
  id: string;
  name: string;
  description?: string | null;
  jsonSchema: unknown;
};

type SuggestDiagnostics = {
  provider: string;
  model: string;
  durationMs: number;
  mappingCount: number;
  warningCount: number;
  mappedFields: number;
  unmappedFields: number;
  usedFallback: boolean;
  normalizedResponse: boolean;
  rawPreview: string | null;
  fallbackReason: string | null;
};

type MappingRun = {
  id: string;
  status: string;
  aiProvider?: string;
  sourceSheetName: string | null;
  columnProfiles: ColumnProfile[] | null;
  sampleRows: Record<string, unknown>[] | null;
  suggestedMapping?: { mappings: FieldMapping[]; warnings: string[] } | null;
  confirmedMapping?: { mappings: FieldMapping[] } | null;
  suggestDiagnostics?: SuggestDiagnostics | null;
  schemaTemplate: SchemaTemplate;
  targetFields: TargetField[];
  workbookMeta?: {
    sheetNames?: string[];
    rowCount?: number;
    columnCount?: number;
  } | null;
  output?: {
    jsonOutput: unknown;
    errors: unknown;
  } | null;
};

type ToastTone = "info" | "success" | "warning";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
};

type ValidationIssue = {
  label: string;
  detail: string;
  technical: string;
  severity: "warning" | "error";
};

type MappingRowData = {
  field: TargetField;
  mapping: FieldMapping;
  sourceProfile: ColumnProfile | null;
  hasAssignment: boolean;
  duplicate: boolean;
  confidence: number;
  status: "blocking" | "review" | "confirmed" | "optional";
  statusLabel: string;
  statusNote: string;
  samples: string[];
};

type SchemaEditorState = {
  name: string;
  description: string;
  schemaText: string;
};

const EMPTY_COLUMNS: ColumnProfile[] = [];
const EMPTY_ROWS: Record<string, unknown>[] = [];

const STARTER_SCHEMA = `{
  "type": "object",
  "required": ["employee_no", "name"],
  "properties": {
    "employee_no": {
      "type": "string",
      "description": "Employee identifier"
    },
    "name": {
      "type": "string",
      "description": "Full name"
    },
    "join_date": {
      "type": "string",
      "description": "Employment start date"
    },
    "salary": {
      "type": "object",
      "properties": {
        "basic": {
          "type": "number",
          "description": "Basic monthly salary"
        }
      }
    }
  }
}`;

function initialMapping(field: TargetField): FieldMapping {
  return {
    targetPath: field.path,
    sourceColumn: null,
    confidence: 0,
    transform: "none",
    reason: "",
    constantValue: null,
  };
}

function emptyEditorState(template: SchemaTemplate | null): SchemaEditorState {
  return {
    name: template?.name ?? "Employee import schema",
    description:
      template?.description ?? "Schema for onboarding employee records from workbook uploads.",
    schemaText: template ? JSON.stringify(template.jsonSchema, null, 2) : STARTER_SCHEMA,
  };
}

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

const swrFetcher = async (url: string) => readJson<unknown>(await fetch(url));

function isTechnicalWarning(warning: string) {
  const value = warning.toLowerCase();
  return value.includes("provider") || value.includes("fallback") || value.includes("backend");
}

function sentenceCase(value: string) {
  if (!value) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
}

function formatSampleValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Empty";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function summarizeSchema(schema: unknown) {
  const fields = flattenJsonSchema(schema);
  return {
    fields,
    required: fields.filter((field) => field.required).length,
    nested: fields.filter((field) => field.path.includes(".")).length,
  };
}

function getConfidenceTone(confidence: number) {
  if (confidence >= 0.9) {
    return { label: "High confidence", className: "confidence-high" };
  }

  if (confidence >= 0.6) {
    return { label: "Needs review", className: "confidence-mid" };
  }

  return { label: "Low confidence", className: "confidence-low" };
}

function statusFromRow(row: MappingRowData) {
  if (row.status === "blocking") {
    return "Needs mapping";
  }

  if (row.duplicate) {
    return "Duplicate";
  }

  if (row.status === "review") {
    return row.confidence > 0 ? "Low confidence" : "Review";
  }

  if (row.status === "confirmed") {
    return "Mapped";
  }

  return "Optional";
}

function humanizePath(path: string) {
  const cleaned = path.replace(/^\//, "").replace(/\//g, ".");
  return cleaned || "This field";
}

function technicalErrorText(error: ValidationErrorShape) {
  return [error.instancePath || "/", error.schemaPath || "/", error.message || "Validation issue"]
    .filter(Boolean)
    .join(" · ");
}

type ValidationErrorShape = {
  instancePath?: string;
  schemaPath?: string;
  keyword?: string;
  message?: string;
  params?: Record<string, unknown>;
};

function translateValidationError(error: ValidationErrorShape): ValidationIssue {
  const path = humanizePath(error.instancePath ?? "");
  const severity = error.keyword === "required" ? "error" : "warning";
  const params = error.params ?? {};
  let detail = error.message ?? "Validation issue";

  switch (error.keyword) {
    case "type": {
      const expected = typeof params.type === "string" ? params.type : "the expected type";
      detail = `${path} must be a ${expected}`;
      break;
    }
    case "required": {
      const missing =
        typeof params.missingProperty === "string" ? params.missingProperty : "field";
      detail = `This record is missing the required field "${missing}"`;
      break;
    }
    case "minLength":
      detail = `${path} is too short`;
      break;
    case "pattern":
      detail = `${path} does not match the expected format`;
      break;
    default:
      detail = sentenceCase(error.message ?? `${path} has a validation issue`);
      break;
  }

  return {
    label: path,
    detail,
    technical: technicalErrorText(error),
    severity,
  };
}

function getValidationIssues(errors: unknown): ValidationIssue[] {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.map((error, index) => {
    const typed = (error ?? {}) as ValidationErrorShape;
    return {
      ...translateValidationError(typed),
      technical: `${index + 1}. ${technicalErrorText(typed)}`,
    };
  });
}

function getRecordPreview(output: unknown, issues: ValidationIssue[]) {
  if (!Array.isArray(output)) {
    return [];
  }

  return output.slice(0, 24).map((record, index) => {
    const typedRecord = record as Record<string, unknown>;
    const title =
      typeof typedRecord.name === "string"
        ? typedRecord.name
        : typeof typedRecord.employee_no === "string"
          ? typedRecord.employee_no
          : `Record ${index + 1}`;
    const issue = issues[index] ?? null;

    return {
      id: index,
      title,
      record,
      issue,
      status: issue ? issue.severity : "ok",
    };
  });
}
const SchemaStep = memo(SchemaStepView);

export function SchemaMatcherWorkbench() {
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<MappingRun | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [output, setOutput] = useState<{ jsonOutput: unknown; errors: unknown } | null>(null);
  const [activeView, setActiveView] = useState<WorkflowView>("schema");
  const [activeWorkbookName, setActiveWorkbookName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(0);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [openMappingDetails, setOpenMappingDetails] = useState<Record<string, boolean>>({});
  const [openModulePanels, setOpenModulePanels] = useState({
    ai: true,
    schema: true,
    source: true,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [, startTransition] = useTransition();

  const { data: templatesData, mutate: mutateTemplates } = useSWR("/api/schema-templates", swrFetcher, {
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to load templates.";
      setToasts((current) => [
        ...current,
        { id: Date.now(), tone: "warning", title: "Templates unavailable", message },
      ]);
    },
  });

  const templates: SchemaTemplate[] = useMemo(
    () => (templatesData as { templates?: SchemaTemplate[] } | undefined)?.templates ?? [],
    [templatesData],
  );

  const effectiveTemplateId = activeTemplateId ?? templates[0]?.id ?? null;

  const activeTemplate =
    templates.find((template) => template.id === effectiveTemplateId) ?? null;

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(1));
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [toasts]);

  const activeColumns = activeRun?.columnProfiles ?? EMPTY_COLUMNS;
  const sampleRows = activeRun?.sampleRows ?? EMPTY_ROWS;
  const suggestDiagnostics = activeRun?.suggestDiagnostics ?? null;
  const rawWarnings = useMemo(
    () => activeRun?.suggestedMapping?.warnings ?? [],
    [activeRun?.suggestedMapping?.warnings],
  );

  const mappingStats = useMemo(() => {
    if (!activeRun) {
      return {
        mapped: 0,
        total: 0,
        requiredMissing: 0,
        reviewNeeded: 0,
        duplicates: 0,
      };
    }

    const duplicateSources = mappings
      .filter((mapping) => mapping.sourceColumn)
      .map((mapping) => mapping.sourceColumn as string)
      .filter((source, index, all) => all.indexOf(source) !== index);

    let mapped = 0;
    let requiredMissing = 0;
    let reviewNeeded = 0;

    for (const field of activeRun.targetFields) {
      const mapping = mappings.find((item) => item.targetPath === field.path);
      const hasAssignment = Boolean(mapping?.sourceColumn || mapping?.constantValue);
      if (hasAssignment) mapped++;

      if (field.required && !mapping?.sourceColumn && !mapping?.constantValue) {
        requiredMissing++;
        continue;
      }

      if (hasAssignment) {
        const duplicate = mapping?.sourceColumn
          ? duplicateSources.includes(mapping.sourceColumn)
          : false;
        if (duplicate || (mapping?.confidence ?? 0) < 0.9) {
          reviewNeeded++;
        }
      }
    }

    return {
      mapped,
      total: activeRun.targetFields.length,
      requiredMissing,
      reviewNeeded,
      duplicates: duplicateSources.length,
    };
  }, [activeRun, mappings]);

  const savedMappings =
    activeRun?.confirmedMapping?.mappings?.slice().sort((a, b) => a.targetPath.localeCompare(b.targetPath)) ??
    [];
  const currentMappings = mappings.slice().sort((a, b) => a.targetPath.localeCompare(b.targetPath));
  const hasSavedMapping = savedMappings.length > 0;
  const hasUnsavedMappingChanges =
    JSON.stringify(savedMappings) !== JSON.stringify(currentMappings);
  const canGenerate =
    Boolean(activeRun) &&
    Boolean(hasSavedMapping) &&
    !hasUnsavedMappingChanges &&
    mappingStats.requiredMissing === 0 &&
    !isGenerating;

  const { blockingIssues, reviewIssues, infoIssues } = useMemo(() => {
    const blocking = [
      ...(mappingStats.requiredMissing > 0
        ? [`${mappingStats.requiredMissing} required field(s) still need a source.`]
        : []),
      ...(mappingStats.duplicates > 0
        ? [`${mappingStats.duplicates} duplicate mapping(s) need confirmation.`]
        : []),
      ...(hasUnsavedMappingChanges && activeRun
        ? ["Save the reviewed mapping before previewing records."]
        : []),
    ];
    const review = [
      ...(mappingStats.reviewNeeded > 0
        ? [`${mappingStats.reviewNeeded} mapped field(s) still need review.`]
        : []),
      ...rawWarnings.filter((warning) => !isTechnicalWarning(warning)),
    ];
    const info = [
      ...rawWarnings.filter((warning) => isTechnicalWarning(warning)),
      ...(suggestDiagnostics?.usedFallback
        ? [suggestDiagnostics.fallbackReason ?? "AI provider fallback was used."]
        : []),
    ];
    return { blockingIssues: blocking, reviewIssues: review, infoIssues: info };
  }, [mappingStats, hasUnsavedMappingChanges, activeRun, rawWarnings, suggestDiagnostics]);
  const aiDegraded = Boolean(infoIssues.length > 0);
  const validationIssues = useMemo(
    () => getValidationIssues(output?.errors ?? []),
    [output?.errors],
  );
  const recordPreview = getRecordPreview(output?.jsonOutput ?? [], validationIssues);
  const selectedRecord =
    recordPreview.find((record) => record.id === selectedRecordId) ?? recordPreview[0] ?? null;

  const mappingRows = useMemo<MappingRowData[]>(() => {
    if (!activeRun) {
      return [];
    }

    const mappingByPath = new Map(mappings.map((mapping) => [mapping.targetPath, mapping]));
    const columnByName = new Map(activeColumns.map((column) => [column.name, column]));
    const duplicateSources = mappings
      .filter((mapping) => mapping.sourceColumn)
      .map((mapping) => mapping.sourceColumn as string)
      .filter((source, index, all) => all.indexOf(source) !== index);

    return activeRun.targetFields.map((field) => {
      const mapping = mappingByPath.get(field.path) ?? initialMapping(field);
      const hasAssignment = Boolean(mapping.sourceColumn || mapping.constantValue);
      const duplicate = mapping.sourceColumn
        ? duplicateSources.includes(mapping.sourceColumn)
        : false;
      const confidence = mapping.confidence ?? 0;
      const sourceProfile = mapping.sourceColumn
        ? columnByName.get(mapping.sourceColumn) ?? null
        : null;
      const samples = sourceProfile?.samples
        ?.filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
        .slice(0, 2)
        .map((value) => String(value)) ?? [];

      if (field.required && !hasAssignment) {
        return {
          field,
          mapping,
          sourceProfile,
          hasAssignment,
          duplicate,
          confidence,
          status: "blocking",
          statusLabel: "Needs mapping",
          statusNote: "This required field must be assigned before you can continue.",
          samples,
        };
      }

      if (duplicate) {
        return {
          field,
          mapping,
          sourceProfile,
          hasAssignment,
          duplicate,
          confidence,
          status: "review",
          statusLabel: "Duplicate source",
          statusNote: "This source column is assigned to more than one schema field.",
          samples,
        };
      }

      if (!hasAssignment) {
        return {
          field,
          mapping,
          sourceProfile,
          hasAssignment,
          duplicate,
          confidence,
          status: "optional",
          statusLabel: "Optional",
          statusNote: "You can leave this blank if the field is not needed.",
          samples,
        };
      }

      if (confidence < 0.9) {
        return {
          field,
          mapping,
          sourceProfile,
          hasAssignment,
          duplicate,
          confidence,
          status: "review",
          statusLabel: confidence < 0.6 ? "Low confidence" : "Needs review",
          statusNote:
            confidence < 0.6
              ? "The AI suggestion looks weak. Double-check the source field."
              : "The suggestion looks plausible but still needs confirmation.",
          samples,
        };
      }

      return {
        field,
        mapping,
        sourceProfile,
        hasAssignment,
        duplicate,
        confidence,
        status: "confirmed",
        statusLabel: "Mapped",
        statusNote: "This field looks good and is ready for output preview.",
        samples,
      };
    });
  }, [activeColumns, activeRun, mappings]);

  const stepStatuses = useMemo(
    () =>
      ({
        schema: activeTemplate ? "complete" : "in-progress",
        workbook: activeRun ? "complete" : activeTemplate ? "in-progress" : "locked",
        mapping: !activeRun
          ? "locked"
          : blockingIssues.length > 0 || reviewIssues.length > 0
            ? "review"
            : hasSavedMapping
              ? "complete"
              : "in-progress",
        output: !activeRun
          ? "locked"
          : output
            ? validationIssues.some((issue) => issue.severity === "error")
              ? "review"
              : "in-progress"
            : "locked",
      }) as const,
    [activeTemplate, activeRun, blockingIssues.length, reviewIssues.length, hasSavedMapping, output, validationIssues],
  );

  const workflowSteps: Array<{
    key: WorkflowView;
    step: number;
    title: string;
    enabled: boolean;
    description: string;
    status: "complete" | "in-progress" | "review" | "locked";
  }> = useMemo(
    () => [
      {
        key: "schema",
        step: 1,
        title: "Schema",
        enabled: true,
        description: activeTemplate?.name ?? "Choose the target structure",
        status: stepStatuses.schema,
      },
      {
        key: "workbook",
        step: 2,
        title: "Workbook",
        enabled: Boolean(activeTemplate),
        description: activeWorkbookName ?? "Load the source workbook",
        status: stepStatuses.workbook,
      },
      {
        key: "mapping",
        step: 3,
        title: "Mapping",
        enabled: Boolean(activeRun),
        description: activeRun ? `${mappingStats.mapped}/${mappingStats.total} mapped` : "Resolve suggestions",
        status: stepStatuses.mapping,
      },
      {
        key: "output",
        step: 4,
        title: "Output",
        enabled: Boolean(output),
        description: output ? "Preview generated records" : "Review records before import",
        status: stepStatuses.output,
      },
    ],
    [activeTemplate, activeWorkbookName, activeRun, mappingStats.mapped, mappingStats.total, output, stepStatuses],
  );

  const currentStepIndex = workflowSteps.findIndex((step) => step.key === activeView);
  const previousStep = workflowSteps[currentStepIndex - 1] ?? null;

  function addToast(tone: ToastTone, title: string, message: string) {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), tone, title, message }]);
  }

  function updateMapping(targetPath: string, updater: (current: FieldMapping) => FieldMapping) {
    const existing = mappings.find((item) => item.targetPath === targetPath) ?? {
      targetPath,
      sourceColumn: null,
      confidence: 0,
      transform: "none",
      reason: "",
      constantValue: null,
    };

    const nextMapping = updater(existing);
    setMappings((current) =>
      current.some((item) => item.targetPath === targetPath)
        ? current.map((item) => (item.targetPath === targetPath ? nextMapping : item))
        : [...current, nextMapping],
    );
  }

  async function handleUpload(file: File) {
    if (!effectiveTemplateId) {
      throw new Error("Create or select a schema template first.");
    }

    setIsUploading(true);

    try {
      const uploadForm = new FormData();
      uploadForm.set("file", file);

      const uploadData = await readJson<{
        uploadedFile: { id: string; originalName: string };
      }>(
        await fetch("/api/uploads", {
          method: "POST",
          body: uploadForm,
        }),
      );

      const runData = await readJson<{ run: MappingRun }>(
        await fetch("/api/mapping-runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadedFileId: uploadData.uploadedFile.id,
            schemaTemplateId: effectiveTemplateId,
          }),
        }),
      );

      setActiveWorkbookName(uploadData.uploadedFile.originalName);
      setActiveRun(runData.run);
      setMappings(runData.run.targetFields.map(initialMapping));
      setOutput(null);
      setSelectedRecordId(0);
      startTransition(() => setActiveView("mapping"));
      addToast(
        "success",
        "Workbook ready",
        `Loaded ${uploadData.uploadedFile.originalName} and prepared the mapping step.`,
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSuggestMapping() {
    if (!activeRun) {
      return;
    }

    setIsSuggesting(true);

    try {
      const data = await readJson<{ run: MappingRun }>(
        await fetch(`/api/mapping-runs/${activeRun.id}/suggest`, {
          method: "POST",
        }),
      );

      setActiveRun(data.run);
      setMappings(
        data.run.targetFields.map((field) => {
          const suggested = data.run.suggestedMapping?.mappings.find(
            (mapping) => mapping.targetPath === field.path,
          );

          return suggested ?? initialMapping(field);
        }),
      );

      const nextOpenDetails = Object.fromEntries(
        data.run.targetFields.map((field) => {
          const suggested = data.run.suggestedMapping?.mappings.find(
            (mapping) => mapping.targetPath === field.path,
          );
          return [field.path, (suggested?.confidence ?? 0) < 0.6];
        }),
      );
      setOpenMappingDetails(nextOpenDetails);

      if (data.run.suggestDiagnostics?.usedFallback) {
        addToast(
          "warning",
          "AI mapping unavailable",
          "Manual mapping mode is still available while the provider is degraded.",
        );
      } else {
        addToast("success", "Suggestions ready", "Review low-confidence rows before continuing.");
      }
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleSaveMapping() {
    if (!activeRun) {
      return;
    }

    setIsSavingMapping(true);

    try {
      const data = await readJson<{ run: MappingRun }>(
        await fetch(`/api/mapping-runs/${activeRun.id}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings }),
        }),
      );

      setActiveRun(data.run);
      addToast("success", "Mapping confirmed", "The current mapping is now ready for output preview.");
    } finally {
      setIsSavingMapping(false);
    }
  }

  async function handleGenerateOutput() {
    if (!activeRun) {
      return;
    }

    setIsGenerating(true);

    try {
      const data = await readJson<{
        output: { jsonOutput: unknown; errors: unknown };
        validation: { valid: boolean };
      }>(
        await fetch(`/api/mapping-runs/${activeRun.id}/output`, {
          method: "POST",
        }),
      );

      setOutput(data.output);
      setSelectedRecordId(0);
      startTransition(() => setActiveView("output"));
      addToast(
        data.validation.valid ? "success" : "warning",
        data.validation.valid ? "Output ready" : "Output needs review",
        data.validation.valid
          ? "Records passed validation and are ready for import review."
          : "Some records need attention before import confirmation.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleNext() {
    if (activeView === "schema" && activeTemplate) {
      startTransition(() => setActiveView("workbook"));
      return;
    }

    if (activeView === "workbook" && activeRun) {
      startTransition(() => setActiveView("mapping"));
      return;
    }

    if (activeView === "mapping") {
      if (!hasSavedMapping || hasUnsavedMappingChanges) {
        void handleSaveMapping();
        return;
      }

      if (canGenerate) {
        void handleGenerateOutput();
      }
    }
  }

  const footerMessage =
    blockingIssues[0] ??
    (activeView === "schema"
      ? "Choose or save a schema to move into workbook setup."
      : activeView === "workbook"
        ? "Confirm the workbook looks right before moving into mapping."
        : activeView === "mapping"
          ? "Resolve duplicates and save the mapping before previewing output."
          : validationIssues.length > 0
            ? validationIssues[0]?.detail ?? "Warnings remain in the output preview."
            : "Review the generated records and confirm the import.");

  return (
    <main className="workspace-shell">
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <article key={toast.id} className={clsx("toast-card", `toast-${toast.tone}`)}>
            <p className="toast-title">{toast.title}</p>
            <p className="toast-message">{toast.message}</p>
          </article>
        ))}
      </div>

      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Linkup schema matcher</p>
            <div className="topbar-title-row">
              <h1>Import wizard</h1>
              <span className="save-pill">{hasUnsavedMappingChanges ? "Unsaved changes" : "All changes saved"}</span>
            </div>
            <p className="topbar-meta">
              Home / Schema matcher / {workflowSteps[currentStepIndex]?.title ?? "Schema"}
            </p>
          </div>
          <div className="topbar-actions">
            <div className="topbar-chip">
              <span className={clsx("connection-dot", aiDegraded ? "offline" : "online")} />
              {suggestDiagnostics?.provider ?? "AI provider"}
            </div>
            <div className="topbar-chip">{activeWorkbookName ?? "No workbook loaded"}</div>
          </div>
        </header>

        <div className="shell-body">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <p className="sidebar-kicker">Workspace</p>
              <h2>One screen, one job</h2>
              <p>Each step keeps the next decision visible and the mechanics tucked away.</p>
            </div>

            <nav className="step-nav" aria-label="Workflow">
              {workflowSteps.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  disabled={!item.enabled}
                  onClick={() => { if (item.enabled) startTransition(() => setActiveView(item.key)); }}
                  className={clsx(
                    "step-nav-item",
                    activeView === item.key && "is-active",
                    item.status === "locked" && "is-locked",
                  )}
                >
                  <div className="step-nav-head">
                    <span className="step-number">{item.step}</span>
                    <div>
                      <p className="step-title">{item.title}</p>
                      <p className="step-description">{item.description}</p>
                    </div>
                  </div>
                  <span className={clsx("status-badge", `status-${item.status}`)}>
                    {item.status === "complete" && "Complete"}
                    {item.status === "in-progress" && "In progress"}
                    {item.status === "review" && "Needs review"}
                    {item.status === "locked" && "Locked"}
                  </span>
                </button>
              ))}
            </nav>

            <div className="sidebar-modules">
              <ModulePanel
                title="AI Provider"
                open={openModulePanels.ai}
                onToggle={() =>
                  setOpenModulePanels((current) => ({ ...current, ai: !current.ai }))
                }
              >
                {aiDegraded ? (
                  <div className="sidebar-alert">
                    AI mapping unavailable. Manual mapping mode is active.
                  </div>
                ) : null}
                <div className="module-row">
                  <span>Provider</span>
                  <span>{suggestDiagnostics?.provider ?? "Ollama / LM Studio"}</span>
                </div>
                <div className="module-row">
                  <span>Model</span>
                  <span>{suggestDiagnostics?.model ?? "Auto detect"}</span>
                </div>
                <div className="module-row">
                  <span>Status</span>
                  <span className="module-connection">
                    <span className={clsx("connection-dot", aiDegraded ? "offline" : "online")} />
                    {aiDegraded ? "Unavailable" : "Connected"}
                  </span>
                </div>
                <div className="module-row">
                  <span>Timeout</span>
                  <span>60000 ms</span>
                </div>
              </ModulePanel>

              <ModulePanel
                title="Schema Library"
                open={openModulePanels.schema}
                onToggle={() =>
                  setOpenModulePanels((current) => ({ ...current, schema: !current.schema }))
                }
              >
                <div className="module-row">
                  <span>Active schema</span>
                  <span>{activeTemplate?.name ?? "Not selected"}</span>
                </div>
                <div className="module-links">
                  <button type="button" onClick={() => startTransition(() => setActiveView("schema"))}>
                    Change schema
                  </button>
                  <button type="button" onClick={() => startTransition(() => setActiveView("schema"))}>
                    Manage schemas
                  </button>
                </div>
              </ModulePanel>

              <ModulePanel
                title="Import Source"
                open={openModulePanels.source}
                onToggle={() =>
                  setOpenModulePanels((current) => ({ ...current, source: !current.source }))
                }
              >
                <div className="module-row">
                  <span>File</span>
                  <span>{activeWorkbookName ?? "None selected"}</span>
                </div>
                <div className="module-row">
                  <span>Sheet</span>
                  <span>{activeRun?.sourceSheetName ?? "Not loaded"}</span>
                </div>
                <div className="module-links">
                  <button type="button" onClick={() => startTransition(() => setActiveView("workbook"))}>
                    Replace file
                  </button>
                </div>
              </ModulePanel>
            </div>
          </aside>

          <section className="main-panel">
            {activeView === "schema" ? (
              <SchemaStep
                key={activeTemplate?.id ?? "new-schema"}
                activeTemplate={activeTemplate}
                onSave={async (payload) => {
                  const data = await readJson<{ template: SchemaTemplate }>(
                    await fetch("/api/schema-templates", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    }),
                  );

                  await mutateTemplates(
                    (current: unknown) => {
                      const existing = (current as { templates?: SchemaTemplate[] } | undefined)
                        ?.templates ?? [];
                      return { templates: [data.template, ...existing] };
                    },
                    { revalidate: false },
                  );
                  setActiveTemplateId(data.template.id);
                  startTransition(() => setActiveView("workbook"));
                  addToast("success", "Schema saved", `Using "${data.template.name}" for the next step.`);
                }}
              />
            ) : null}

            {activeView === "workbook" ? (
              <div className="step-screen">
                <section className="hero-card">
                  <div>
                    <p className="eyebrow">Step 2</p>
                    <h2>Confirm the source workbook looks right</h2>
                    <p className="lede">
                      No mapping or validation noise here. This screen is only about choosing the
                      file, sheet, headers, and a quick row preview.
                    </p>
                  </div>
                  <div className="hero-metrics">
                    <MetricCard label="Schema" value={activeTemplate?.name ?? "None"} />
                    <MetricCard label="Rows" value={String(activeRun?.workbookMeta?.rowCount ?? sampleRows.length)} />
                    <MetricCard label="Columns" value={String(activeRun?.workbookMeta?.columnCount ?? activeColumns.length)} />
                  </div>
                </section>

                <section className="surface-card workbook-grid">
                  <label className={clsx("upload-zone", (!activeTemplate || isUploading) && "disabled")}>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden-input"
                      disabled={!activeTemplate || isUploading}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }

                        try {
                          await handleUpload(file);
                        } catch (error) {
                          addToast(
                            "warning",
                            "Upload failed",
                            error instanceof Error ? error.message : "Workbook upload failed.",
                          );
                        } finally {
                          event.target.value = "";
                        }
                      }}
                    />
                    <p className="upload-title">{isUploading ? "Uploading workbook..." : "Drop workbook here or choose a file"}</p>
                    <p className="upload-copy">
                      Supports `.xlsx` and `.xls`. We’ll detect likely headers and prepare sample
                      rows for the mapping step.
                    </p>
                  </label>

                  <div className="surface-subcard">
                    <p className="mini-title">Import settings</p>
                    <div className="mini-stack">
                      <div className="module-row">
                        <span>File</span>
                        <span>{activeWorkbookName ?? "Not uploaded"}</span>
                      </div>
                      <div className="module-row">
                        <span>Sheet</span>
                        <span>{activeRun?.sourceSheetName ?? "Auto detect"}</span>
                      </div>
                      <div className="module-row">
                        <span>Header row</span>
                        <span>Row 1</span>
                      </div>
                    </div>
                  </div>
                </section>

                {activeRun ? (
                  <>
                    <section className="surface-card">
                      <div className="section-head">
                        <div>
                          <h3>Preview</h3>
                          <p>Check the first few rows before moving into mapping.</p>
                        </div>
                        <div className="section-actions">
                          {(activeRun.workbookMeta?.sheetNames ?? [activeRun.sourceSheetName ?? "Sheet1"]).map((sheet) => (
                            <span key={sheet} className={clsx("sheet-pill", sheet === activeRun.sourceSheetName && "active")}>
                              {sheet}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="preview-table">
                        <div className="preview-row header">
                          {activeColumns.map((column) => (
                            <span key={column.name}>{column.name}</span>
                          ))}
                        </div>
                        {sampleRows.slice(0, 5).map((row, index) => (
                          <div key={`row-${index}`} className="preview-row">
                            {activeColumns.map((column) => (
                              <span key={`${index}-${column.name}`}>
                                {formatSampleValue((row as Record<string, unknown>)[column.name])}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                ) : null}
              </div>
            ) : null}

            {activeView === "mapping" ? (
              <div className="step-screen">
                <section className="hero-card">
                  <div>
                    <p className="eyebrow">Step 3</p>
                    <h2>Map workbook columns to schema fields</h2>
                    <p className="lede">
                      Focus on one row at a time. Duplicates, low confidence suggestions, and
                      required fields are surfaced inline instead of being buried in a separate report.
                    </p>
                  </div>
                  <div className="hero-metrics">
                    <MetricCard label="Mapped" value={`${mappingStats.mapped}/${mappingStats.total}`} />
                    <MetricCard label="Review" value={String(mappingStats.reviewNeeded)} />
                    <MetricCard label="Duplicates" value={String(mappingStats.duplicates)} />
                  </div>
                </section>

                <section className="surface-card">
                  <div className="section-head">
                    <div>
                      <h3>Mapping table</h3>
                      <p>Use AI suggestions when available, then confirm or override them.</p>
                    </div>
                    <div className="section-actions">
                      <button
                        type="button"
                        onClick={() => void handleSuggestMapping()}
                        disabled={isSuggesting || !activeRun}
                        className="secondary-button"
                      >
                        {isSuggesting ? "Suggesting..." : "Suggest mapping"}
                      </button>
                    </div>
                  </div>

                  {blockingIssues.length > 0 ? (
                    <div className="issue-strip error">
                      {blockingIssues[0]}
                    </div>
                  ) : null}

                  <div className="mapping-header-grid">
                    <span>Source column</span>
                    <span>Schema field</span>
                    <span>Status</span>
                  </div>

                  <div className="mapping-list">
                    {mappingRows.map((row) => {
                      const confidenceTone = getConfidenceTone(row.confidence);
                      const detailOpen =
                        openMappingDetails[row.field.path] ||
                        row.duplicate ||
                        (row.confidence > 0 && row.confidence < 0.6);

                      return (
                        <article key={row.field.path} className="mapping-row-card">
                          <div className="mapping-grid">
                            <div className="mapping-source">
                              <p className="mapping-title">{row.mapping.sourceColumn ?? "Unmapped source"}</p>
                              <p className="mapping-subtle">
                                {row.samples[0]
                                  ? `Sample: ${row.samples[0]}`
                                  : "Pick a source column to preview sample values."}
                              </p>
                            </div>

                            <div className="mapping-arrow" aria-hidden="true">
                              {isSuggesting ? "↝" : "→"}
                            </div>

                            <div className="mapping-target">
                              <label className="field-label inline">
                                <span className="field-heading">
                                  {row.field.path} <em>{row.field.type}</em>
                                </span>
                                <select
                                  value={row.mapping.sourceColumn ?? ""}
                                  onChange={(event) => {
                                    updateMapping(row.field.path, (current) => ({
                                      ...current,
                                      sourceColumn: event.target.value || null,
                                    }));
                                  }}
                                  className="field-select"
                                >
                                  <option value="">Map manually</option>
                                  {activeColumns.map((column) => (
                                    <option key={column.name} value={column.name}>
                                      {column.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              {row.confidence > 0 ? (
                                <div className="confidence-wrap">
                                  <div className="confidence-meta">
                                    <span>{confidenceTone.label}</span>
                                    <span>{Math.round(row.confidence * 100)}%</span>
                                  </div>
                                  <div className="confidence-bar">
                                    <div
                                      className={clsx("confidence-fill", confidenceTone.className)}
                                      style={{ width: `${Math.round(row.confidence * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="mapping-status">
                              <button
                                type="button"
                                className={clsx("status-badge large", `status-${row.status === "blocking" ? "review" : row.status}`)}
                                onClick={() =>
                                  setOpenMappingDetails((current) => ({
                                    ...current,
                                    [row.field.path]: !detailOpen,
                                  }))
                                }
                              >
                                {statusFromRow(row)}
                              </button>
                            </div>
                          </div>

                          {row.duplicate ? (
                            <div className="duplicate-banner">
                              <p>
                                &quot;{row.mapping.sourceColumn}&quot; is mapped to more than one schema field.
                                Confirm which target should keep it.
                              </p>
                              <div className="section-actions">
                                <button
                                  type="button"
                                  className="ghost-button"
                                  onClick={() =>
                                    setMappings((current) =>
                                      current.map((item) =>
                                        item.targetPath === row.field.path
                                          ? { ...item, sourceColumn: null, confidence: 0 }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  Map manually
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {detailOpen ? (
                            <div className="mapping-detail-card">
                              <p className="mapping-note">{row.statusNote}</p>
                              <div className="mapping-detail-grid">
                                <label className="field-label">
                                  Transform
                                  <select
                                    value={row.mapping.transform ?? "none"}
                                    onChange={(event) => {
                                      updateMapping(row.field.path, (current) => ({
                                        ...current,
                                        transform: event.target.value as FieldMapping["transform"],
                                      }));
                                    }}
                                    className="field-select"
                                  >
                                    <option value="none">none</option>
                                    <option value="trim">trim</option>
                                    <option value="to_number">to_number</option>
                                    <option value="parse_date">parse_date</option>
                                    <option value="uppercase">uppercase</option>
                                    <option value="lowercase">lowercase</option>
                                  </select>
                                </label>
                                <label className="field-label">
                                  Constant value
                                  <input
                                    value={row.mapping.constantValue ?? ""}
                                    onChange={(event) => {
                                      updateMapping(row.field.path, (current) => ({
                                        ...current,
                                        constantValue: event.target.value || null,
                                      }));
                                    }}
                                    className="field-input"
                                    placeholder="Optional default"
                                  />
                                </label>
                              </div>
                              <label className="field-label">
                                Hint or review note
                                <textarea
                                  value={row.mapping.reason ?? ""}
                                  onChange={(event) => {
                                    updateMapping(row.field.path, (current) => ({
                                      ...current,
                                      reason: event.target.value,
                                    }));
                                  }}
                                  className="field-textarea compact"
                                  placeholder="Document why this mapping is correct."
                                />
                              </label>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : null}

            {activeView === "output" ? (
              <div className="step-screen">
                <section className="hero-card">
                  <div>
                    <p className="eyebrow">Step 4</p>
                    <h2>Review generated records before import</h2>
                    <p className="lede">
                      The default view stays human-readable. Technical validation details are tucked
                      behind a toggle for developers.
                    </p>
                  </div>
                  <div className="hero-metrics">
                    <MetricCard label="Records" value={String(Array.isArray(output?.jsonOutput) ? output?.jsonOutput.length : 0)} />
                    <MetricCard label="Warnings" value={String(validationIssues.filter((issue) => issue.severity === "warning").length)} />
                    <MetricCard label="Errors" value={String(validationIssues.filter((issue) => issue.severity === "error").length)} />
                  </div>
                </section>

                <section className="output-grid">
                  <div className="surface-card">
                    <div className="section-head">
                      <div>
                        <h3>Record preview</h3>
                        <p>Click a record to inspect the transformed JSON for just that row.</p>
                      </div>
                      <div className="section-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setShowTechnicalDetails((current) => !current)}
                        >
                          {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
                        </button>
                      </div>
                    </div>

                    <div className="record-list">
                      {recordPreview.map((record) => (
                        <button
                          key={record.id}
                          type="button"
                          className={clsx("record-row", selectedRecord?.id === record.id && "active")}
                          onClick={() => setSelectedRecordId(record.id)}
                        >
                          <div>
                            <p className="record-title">{record.title}</p>
                            <p className="record-detail">
                              {record.issue ? record.issue.detail : "Looks ready for import."}
                            </p>
                          </div>
                          <span
                            className={clsx(
                              "status-badge",
                              record.status === "ok"
                                ? "status-complete"
                                : record.status === "error"
                                  ? "status-review"
                                  : "status-in-progress",
                            )}
                          >
                            {record.status === "ok" ? "OK" : record.status === "error" ? "Error" : "Warning"}
                          </span>
                        </button>
                      ))}
                    </div>

                    {selectedRecord ? (
                      <div className="record-expanded">
                        {selectedRecord.issue ? (
                          <ValidationMessage
                            issue={selectedRecord.issue}
                            showTechnicalDetails={showTechnicalDetails}
                          />
                        ) : null}
                        <pre className="json-panel">
                          {JSON.stringify(selectedRecord.record, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>

                  <div className="surface-card summary-panel">
                    <div className="section-head">
                      <div>
                        <h3>Summary</h3>
                        <p>Proceed is allowed with warnings, but not if you still have blocking issues upstream.</p>
                      </div>
                    </div>
                    <div className="summary-stats">
                      <MetricCard label="Records" value={String(recordPreview.length)} />
                      <MetricCard
                        label="Valid"
                        value={String(recordPreview.filter((record) => record.status === "ok").length)}
                      />
                      <MetricCard
                        label="Warnings"
                        value={String(recordPreview.filter((record) => record.status === "warning").length)}
                      />
                      <MetricCard
                        label="Errors"
                        value={String(recordPreview.filter((record) => record.status === "error").length)}
                      />
                    </div>
                    <div className="summary-actions">
                      <button type="button" className="ghost-button">
                        View all warnings
                      </button>
                      <button type="button" className="ghost-button">
                        Download JSON
                      </button>
                      <button type="button" className="primary-button">
                        Confirm import
                      </button>
                    </div>
                    {validationIssues.length > 0 ? (
                      <div className="validation-list">
                        {validationIssues.slice(0, 4).map((issue) => (
                          <ValidationMessage
                            key={issue.technical}
                            issue={issue}
                            showTechnicalDetails={showTechnicalDetails}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state success">
                        Validation passed. Records are ready for import confirmation.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>

        <footer className="footer-bar">
          <div>
            <p className="footer-step">
              Step {currentStepIndex + 1} of {workflowSteps.length}
            </p>
            <p className="footer-copy">{footerMessage}</p>
          </div>
          <div className="footer-actions">
            <button
              type="button"
              onClick={() => { if (previousStep) startTransition(() => setActiveView(previousStep.key)); }}
              disabled={!previousStep}
              className="ghost-button"
            >
              Back
            </button>

            {activeView === "mapping" ? (
              <button
                type="button"
                onClick={() => void handleSaveMapping()}
                disabled={isSavingMapping}
                className="secondary-button"
              >
                {isSavingMapping ? "Saving..." : "Confirm mapping"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void handleNext()}
              disabled={
                (activeView === "schema" && !activeTemplate) ||
                (activeView === "workbook" && !activeRun) ||
                (activeView === "mapping" && !activeRun) ||
                activeView === "output"
              }
              className="primary-button"
            >
              {activeView === "schema" && "Next"}
              {activeView === "workbook" && "Next"}
              {activeView === "mapping" &&
                (canGenerate ? (isGenerating ? "Generating..." : "Preview output") : "Save and continue")}
              {activeView === "output" && "Confirm import"}
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

function SchemaStepView({
  activeTemplate,
  onSave,
}: {
  activeTemplate: SchemaTemplate | null;
  onSave: (payload: {
    name: string;
    description?: string;
    jsonSchema: unknown;
  }) => Promise<void>;
}) {
  const [editorState, setEditorState] = useState<SchemaEditorState>(emptyEditorState(activeTemplate));
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaSaving, setSchemaSaving] = useState(false);

  const parsedEditorSchema = useMemo(() => {
    try {
      return JSON.parse(editorState.schemaText) as unknown;
    } catch {
      return null;
    }
  }, [editorState.schemaText]);

  const schemaSummary = useMemo(
    () => summarizeSchema(parsedEditorSchema ?? activeTemplate?.jsonSchema ?? {}),
    [activeTemplate?.jsonSchema, parsedEditorSchema],
  );

  return (
    <div className="step-screen">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2>Choose the schema your records need to match</h2>
          <p className="lede">
            Keep this step focused on the target structure. File handling, mapping, and
            validation stay in later screens.
          </p>
        </div>
        <div className="hero-metrics">
          <MetricCard label="Fields" value={String(schemaSummary.fields.length)} />
          <MetricCard label="Required" value={String(schemaSummary.required)} />
          <MetricCard label="Nested" value={String(schemaSummary.nested)} />
        </div>
      </section>

      <section className="surface-card schema-editor-grid">
        <div className="schema-editor-stack">
          <label className="field-label">
            Schema name
            <input
              value={editorState.name}
              onChange={(event) =>
                setEditorState((current) => ({ ...current, name: event.target.value }))
              }
              className="field-input"
              placeholder="Employee import schema"
            />
          </label>
          <label className="field-label">
            Description
            <textarea
              value={editorState.description}
              onChange={(event) =>
                setEditorState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="field-textarea compact"
              placeholder="What this schema is used for"
            />
          </label>
        </div>
        <div className="schema-actions-card">
          <p className="mini-title">Status</p>
          <p>{parsedEditorSchema ? "Schema JSON is valid and ready to save." : "Fix the schema JSON before saving."}</p>
          <button
            type="button"
            className="ghost-button"
            onClick={() =>
              setEditorState((current) => ({
                ...current,
                schemaText: JSON.stringify(parsedEditorSchema ?? activeTemplate?.jsonSchema ?? {}, null, 2),
              }))
            }
          >
            Reformat JSON
          </button>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <h3>Field list</h3>
            <p>Show the schema in plain language so the import target is obvious at a glance.</p>
          </div>
          <div className="section-actions">
            <button type="button" className="ghost-button">Add field</button>
            <button type="button" className="ghost-button">Import from file or URL</button>
          </div>
        </div>
        <div className="data-table">
          <div className="data-table-row header">
            <span>Field</span>
            <span>Type</span>
            <span>Required</span>
            <span>Description</span>
          </div>
          {schemaSummary.fields.map((field) => (
            <div key={field.path} className="data-table-row">
              <span>{field.path}</span>
              <span>{field.type}</span>
              <span>{field.required ? "Yes" : "No"}</span>
              <span>{field.description ?? "No description yet"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-head">
          <div>
            <h3>Developer view</h3>
            <p>The raw schema stays available, but it no longer dominates the screen.</p>
          </div>
        </div>
        <textarea
          value={editorState.schemaText}
          onChange={(event) =>
            setEditorState((current) => ({ ...current, schemaText: event.target.value }))
          }
          className="field-textarea code-panel"
          spellCheck={false}
        />
        {schemaError ? <p className="inline-error">{schemaError}</p> : null}
        <div className="section-actions">
          <button
            type="button"
            onClick={async () => {
              setSchemaSaving(true);
              setSchemaError(null);

              try {
                const parsed = JSON.parse(editorState.schemaText);
                await onSave({
                  name: editorState.name,
                  description: editorState.description,
                  jsonSchema: parsed,
                });
              } catch (error) {
                setSchemaError(
                  error instanceof Error ? error.message : "Unable to create schema template.",
                );
              } finally {
                setSchemaSaving(false);
              }
            }}
            disabled={schemaSaving}
            className="primary-button"
          >
            {schemaSaving ? "Saving schema..." : "Save schema"}
          </button>
        </div>
      </section>
    </div>
  );
}

const ModulePanel = memo(function ModulePanel({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="module-panel">
      <button type="button" className="module-toggle" onClick={onToggle}>
        <span>{title}</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="module-body">{children}</div> : null}
    </section>
  );
});

const MetricCard = memo(function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
});

const ValidationMessage = memo(function ValidationMessage({
  issue,
  showTechnicalDetails,
}: {
  issue: ValidationIssue;
  showTechnicalDetails: boolean;
}) {
  return (
    <article className={clsx("validation-card", issue.severity === "error" ? "error" : "warning")}>
      <p className="validation-title">{issue.detail}</p>
      {showTechnicalDetails ? <p className="validation-technical">{issue.technical}</p> : null}
    </article>
  );
});
