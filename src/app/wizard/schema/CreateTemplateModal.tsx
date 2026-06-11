"use client";

import { useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import { cn } from "@/lib/utils";

export type TemplateField = {
  id: string;
  sourceHeader: string;
  fieldName: string;
  dataType: "String" | "Number" | "Boolean" | "Date" | "Object";
  required: boolean;
};

type CreateSchemaTemplatePayload = {
  name: string;
  description?: string;
  jsonSchema: unknown;
};

export type SchemaTemplateDraft = {
  id: string;
  name: string;
  description?: string | null;
  jsonSchema: unknown;
};

type CreateTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateTemplate: (payload: CreateSchemaTemplatePayload) => Promise<void>;
  initialTemplate?: SchemaTemplateDraft | null;
};

const DEFAULT_TEMPLATE_NAME = "Custom template";
const DEFAULT_TEMPLATE_DESCRIPTION = "Define fields and schema for your mapping project";

function cloneDefaultFields() {
  return [];
}

function fieldFromTargetPath(path: string, type: string, required: boolean): TemplateField {
  const normalizedType =
    type === "number"
      ? "Number"
      : type === "boolean"
        ? "Boolean"
        : type === "object" || type.endsWith("[]")
          ? "Object"
          : "String";

  return {
    id: path,
    sourceHeader: path,
    fieldName: path,
    dataType: normalizedType,
    required,
  };
}

function fieldsFromSchema(schema: unknown) {
  return flattenJsonSchema(schema).map((field) =>
    fieldFromTargetPath(field.path, field.type, field.required),
  );
}

function jsonTypeFor(dataType: TemplateField["dataType"]) {
  switch (dataType) {
    case "String":
    case "Date":
      return "string";
    case "Number":
      return "number";
    case "Boolean":
      return "boolean";
    case "Object":
      return "object";
    default:
      return "string";
  }
}

function createObjectSchema() {
  return {
    type: "object" as const,
    properties: {} as Record<string, unknown>,
  };
}

function buildSchemaFromFields(fields: TemplateField[]) {
  const root = createObjectSchema() as {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };

  for (const field of fields) {
    const segments = field.fieldName
      .split(".")
      .map((part) => part.trim())
      .filter(Boolean);

    if (segments.length === 0) {
      continue;
    }

    let cursor = root;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isLeaf = index === segments.length - 1;

      if (isLeaf) {
        cursor.properties[segment] =
          field.dataType === "Object"
            ? createObjectSchema()
            : { type: jsonTypeFor(field.dataType) };

        if (field.required) {
          cursor.required ??= [];
          if (!cursor.required.includes(segment)) {
            cursor.required.push(segment);
          }
        }
        continue;
      }

      const nextValue = cursor.properties[segment];
      const nextSchema =
        nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)
          ? (nextValue as {
              type?: string;
              properties?: Record<string, unknown>;
              required?: string[];
            })
          : createObjectSchema();

      cursor.properties[segment] = nextSchema;
      cursor = nextSchema as typeof cursor;
    }
  }

  return root;
}

const dataTypeOptions: TemplateField["dataType"][] = [
  "String",
  "Number",
  "Boolean",
  "Date",
  "Object",
];

export function CreateTemplateModal({
  isOpen,
  onClose,
  onCreateTemplate,
  initialTemplate,
}: CreateTemplateModalProps) {
  const [templateName, setTemplateName] = useState(
    initialTemplate?.name ?? DEFAULT_TEMPLATE_NAME,
  );
  const [templateDescription, setTemplateDescription] = useState(
    initialTemplate?.description ?? DEFAULT_TEMPLATE_DESCRIPTION,
  );
  const [fields, setFields] = useState<TemplateField[]>(
    initialTemplate ? fieldsFromSchema(initialTemplate.jsonSchema) : cloneDefaultFields(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof TemplateField>(
    fieldId: string,
    key: K,
    value: TemplateField[K],
  ) {
    setFields((current) =>
      current.map((field) => (field.id === fieldId ? { ...field, [key]: value } : field)),
    );
  }

  function addField() {
    const nextIndex = fields.length + 1;
    setFields((current) => [
      ...current,
      {
        id: `field-${nextIndex}`,
        sourceHeader: `column_${nextIndex}`,
        fieldName: `Field${nextIndex}`,
        dataType: "String",
        required: false,
      },
    ]);
  }

  function removeField(fieldId: string) {
    setFields((current) => current.filter((field) => field.id !== fieldId));
  }

  const schemaPreview = JSON.stringify(buildSchemaFromFields(fields), null, 2);

  async function handleSave() {
    const name = templateName.trim();

    if (!name) {
      setError("Template name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onCreateTemplate({
        name,
        description: templateDescription.trim() || undefined,
        jsonSchema: buildSchemaFromFields(fields),
      });
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to create schema template.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[1120px] sm:max-w-[1120px] w-full h-[calc(100vh-56px)] sm:h-[min(760px,calc(100vh-56px))] max-h-[calc(100vh-56px)] p-0 gap-0 overflow-hidden rounded-[22px] grid-rows-[auto_1fr_auto]"
      >
        <DialogHeader
          className="px-8 py-4 bg-white/66 border-b border-[var(--color-border)] flex flex-row items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <DialogTitle className="text-[1.05rem] leading-snug">
              {initialTemplate ? "Edit Saved Template" : "Create Custom Template"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[0.92rem] leading-snug">
              {templateDescription}
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full shrink-0"
                aria-label="Close custom template modal"
              />
            }
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </DialogClose>
        </DialogHeader>

        <div
          className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_360px] overflow-hidden"
        >
          <div
            className="min-h-0 overflow-y-auto px-8 py-5 pb-8 bg-white/32"
          >
            <section>
              <div className="flex gap-3 justify-between items-stretch">
                <label className="grid gap-2 flex-1">
                  <span className="text-sm font-medium">Template Name</span>
                  <Input
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="h-auto rounded-xl px-4 py-3.5"
                  />
                </label>
                <label className="grid gap-2 flex-[1.4]">
                  <span className="text-sm font-medium">Template Description</span>
                  <Input
                    value={templateDescription}
                    onChange={(event) => setTemplateDescription(event.target.value)}
                    className="h-auto rounded-xl px-4 py-3.5"
                  />
                </label>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center gap-3">
                <span className="size-7 rounded-full bg-[var(--color-ink)] text-white grid place-items-center text-xs font-bold shrink-0">
                  1
                </span>
                <h4 className="m-0 text-sm font-semibold">Upload Sample</h4>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                style={{ display: "none" }}
              />
              <div
                role="button"
                tabIndex={0}
                className="mt-4 p-5 border-2 border-dashed border-[rgba(236,234,228,0.92)] rounded-[18px] bg-[linear-gradient(180deg,rgba(252,251,248,0.94),rgba(247,244,237,0.42))] flex items-center gap-4 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="size-12 rounded-full shrink-0 grid place-items-center bg-white/92 border border-[rgba(236,234,228,0.92)] text-[var(--color-ink)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <path d="M7 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17 8.5h.5a3.5 3.5 0 1 1 0 7H7Z" />
                    <path d="M12 8v8" />
                    <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold m-0">Drop a .csv or .xlsx file here</p>
                  <p className="text-[#6f726f] text-[0.85rem] mt-1 m-0">
                    Auto-detect fields and data types
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 h-10 rounded-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </Button>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="size-7 rounded-full bg-[var(--color-ink)] text-white grid place-items-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <h4 className="m-0 text-sm font-semibold">Field Configuration</h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="font-bold shrink-0"
                  onClick={addField}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="size-4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Field
                </Button>
              </div>

              <div className="mt-4 border border-[var(--color-border)] rounded-[18px] overflow-hidden bg-white/92 shadow-[0_10px_32px_rgba(28,28,28,0.05)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">Source Header</TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">Field Name</TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">Data Type</TableHead>
                      <TableHead className="text-center whitespace-nowrap px-4 py-2.5">Req.</TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="px-4 py-2.5">
                          <Input
                            value={field.sourceHeader}
                            onChange={(event) =>
                              updateField(field.id, "sourceHeader", event.target.value)
                            }
                            className="h-auto rounded-[10px] px-3 py-2 font-mono text-[0.9rem]"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <Input
                            value={field.fieldName}
                            onChange={(event) => updateField(field.id, "fieldName", event.target.value)}
                            className="h-auto rounded-[10px] px-3 py-2"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <select
                            className={cn(
                              "w-full min-w-0 rounded-[10px] border border-input bg-transparent px-3 py-2 text-sm transition-colors",
                              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
                            )}
                            value={field.dataType}
                            onChange={(event) =>
                              updateField(
                                field.id,
                                "dataType",
                                event.target.value as TemplateField["dataType"],
                              )
                            }
                          >
                            {dataTypeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-center">
                          <input
                            type="checkbox"
                            className="size-5 accent-[var(--color-ink)]"
                            checked={field.required}
                            onChange={(event) => updateField(field.id, "required", event.target.checked)}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${field.fieldName}`}
                            onClick={() => removeField(field.id)}
                            className="text-[#ba1a1a]"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="size-[18px]"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>

          <aside
            className="min-h-0 overflow-auto px-7 py-5 bg-[rgba(252,251,248,0.98)] border-l border-[var(--color-border)] grid content-start gap-4"
          >
            <div className="flex items-center gap-2 font-bold">
              <svg viewBox="0 0 24 24" fill="none" className="size-5">
                <path d="m8 9-3 3 3 3" />
                <path d="m16 9 3 3-3 3" />
              </svg>
              <h4 className="m-0 text-sm">Schema Preview</h4>
            </div>

            <div
              className="relative p-4 rounded-[16px] bg-[rgba(247,244,237,0.9)] border border-[var(--color-border)] text-[var(--color-ink)] overflow-auto"
            >
              <span
                className="absolute top-3 right-3 bg-[rgba(28,28,28,0.04)] px-[10px] py-1 rounded-[6px] text-[0.75rem] font-bold tracking-[0.05em] text-[var(--color-ink)]"
              >
                JSON
              </span>
              <pre
                className="m-0 pt-7 text-[0.82rem] leading-[1.6] text-[var(--color-ink)] whitespace-pre overflow-auto max-h-full"
              >
                {schemaPreview}
              </pre>
            </div>

            <div
              className="p-3.5 border border-[rgba(236,234,228,0.98)] rounded-[14px] bg-white/58 text-[#6f726f] leading-snug text-[0.8rem]"
            >
              <strong>Tip:</strong> Use dot notation for nested fields like user.address.
            </div>

            {error ? (
              <div
                className="p-3.5 border border-[rgba(185,28,28,0.18)] rounded-[14px] bg-[rgba(254,242,242,0.72)] text-[#991b1b] leading-snug text-[0.8rem]"
              >
                {error}
              </div>
            ) : null}
          </aside>
        </div>

        <DialogFooter
          showCloseButton={false}
          className="mx-0 mb-0 px-8 pt-5 pb-7 bg-white/66 border-t border-[var(--color-border)] rounded-b-[22px] flex items-center justify-between"
        >
          <Button
            type="button"
            variant="ghost"
            className="text-[#6f726f]"
            onClick={() => {
              setTemplateName(DEFAULT_TEMPLATE_NAME);
              setTemplateDescription(DEFAULT_TEMPLATE_DESCRIPTION);
              setFields(initialTemplate ? fieldsFromSchema(initialTemplate.jsonSchema) : []);
              setError(null);
            }}
          >
            Reset Changes
          </Button>
          <div className="flex gap-4 items-center pr-2">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  className="px-6 py-3"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="px-6 py-3"
            >
              {saving
                ? initialTemplate
                  ? "Updating Template..."
                  : "Saving Template..."
                : initialTemplate
                  ? "Update Template"
                  : "Save Template"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
