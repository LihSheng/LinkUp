"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";

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
import { buildTemplateFieldsFromRows } from "@/lib/excel/template-import";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const DEFAULT_TEMPLATE_NAME = "";
const DEFAULT_TEMPLATE_DESCRIPTION = "";

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
  const { t } = useTranslation();
  const [templateName, setTemplateName] = useState(
    initialTemplate?.name ?? "",
  );
  const [templateDescription, setTemplateDescription] = useState(
    initialTemplate?.description ?? "",
  );
  const [fields, setFields] = useState<TemplateField[]>(
    initialTemplate ? fieldsFromSchema(initialTemplate.jsonSchema) : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triedSave, setTriedSave] = useState(false);
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
        sourceHeader: "",
        fieldName: "",
        dataType: "String",
        required: false,
      },
    ]);
    setTriedSave(false);
  }

  function removeField(fieldId: string) {
    setFields((current) => current.filter((field) => field.id !== fieldId));
    setTriedSave(false);
  }

  const schemaPreview = JSON.stringify(buildSchemaFromFields(fields), null, 2);

  async function handleSave() {
    const name = templateName.trim();
    const errors: string[] = [];

    const description = templateDescription.trim();

    if (!name) {
      errors.push(t("wizard.createTemplate.errorName"));
    }

    if (!description) {
      errors.push(t("wizard.createTemplate.errorDescription"));
    }

    if (fields.length === 0) {
      errors.push(t("wizard.createTemplate.errorFields"));
    }

    const emptySourceHeaders = fields.filter((f) => !f.sourceHeader.trim());
    const emptyFieldNames = fields.filter((f) => !f.fieldName.trim());

    if (emptySourceHeaders.length > 0) {
      errors.push(t("wizard.createTemplate.errorSourceHeader"));
    }

    if (emptyFieldNames.length > 0) {
      errors.push(t("wizard.createTemplate.errorFieldName"));
    }

    if (errors.length > 0) {
      setTriedSave(true);
      errors.forEach((msg) => toast.error(msg));
      return;
    }

    setTriedSave(false);
    setSaving(true);
    setError(null);

    try {
      await onCreateTemplate({
        name,
        description: description || undefined,
        jsonSchema: buildSchemaFromFields(fields),
      });
      onClose();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : t("wizard.createTemplate.errorCreate"),
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
          className="px-8 py-4 bg-[var(--surface-panel)] border-b border-[var(--color-border)] flex flex-row items-start justify-between gap-4"
        >
          <div className="min-w-0">
            <DialogTitle className="text-[1.05rem] leading-snug">
              {initialTemplate ? t("wizard.createTemplate.titleEdit") : t("wizard.createTemplate.titleCreate")}
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
                aria-label={t("wizard.createTemplate.closeAriaLabel")}
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
            className="min-h-0 overflow-y-auto px-8 py-5 pb-8 bg-[var(--surface-panel-soft)]"
          >
            <section>
              <div className="flex gap-3 justify-between items-stretch">
                <label className="grid gap-2 flex-1">
                  <span className="text-sm font-medium">{t("wizard.createTemplate.templateName")}</span>
                  <Input
                    value={templateName}
                    onChange={(event) => {
                      setTemplateName(event.target.value);
                      setTriedSave(false);
                    }}
                    placeholder={t("wizard.createTemplate.templateNamePlaceholder")}
                    className={cn(
                      "h-auto rounded-xl px-4 py-3.5",
                      triedSave && !templateName.trim() && "border-red-500 ring-red-500/50",
                    )}
                  />
                </label>
                <label className="grid gap-2 flex-[1.4]">
                  <span className="text-sm font-medium">{t("wizard.createTemplate.templateDescription")}</span>
                  <Input
                    value={templateDescription}
                    onChange={(event) => {
                      setTemplateDescription(event.target.value);
                      setTriedSave(false);
                    }}
                    placeholder={t("wizard.createTemplate.templateDescriptionPlaceholder")}
                    className={cn(
                      "h-auto rounded-xl px-4 py-3.5",
                      triedSave && !templateDescription.trim() && "border-red-500 ring-red-500/50",
                    )}
                  />
                </label>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center gap-3">
                <span className="size-7 rounded-full bg-[var(--color-ink)] text-[var(--color-on-ink)] grid place-items-center text-xs font-bold shrink-0">
                  1
                </span>
                <h4 className="m-0 text-sm font-semibold">{t("wizard.createTemplate.uploadSample")}</h4>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                style={{ display: "none" }}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  try {
                    const data = new Uint8Array(await file.arrayBuffer());
                    const workbook = XLSX.read(data, { type: "array", raw: false });
                    const firstSheetName = workbook.SheetNames[0];

                    if (!firstSheetName) {
                      throw new Error(t("wizard.createTemplate.errorNoSheets"));
                    }

                    const firstSheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
                      header: 1,
                      defval: "",
                      blankrows: false,
                    }) as unknown[][];

                    const detectedFields = buildTemplateFieldsFromRows(rows);

                    if (detectedFields.length === 0) {
                      throw new Error(
                        t("wizard.createTemplate.errorNoHeader"),
                      );
                    }

                    setFields(detectedFields);
                    setTriedSave(false);
                    setError(null);
                  } catch (caughtError) {
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : t("wizard.createTemplate.errorReadFile"),
                    );
                  } finally {
                    event.target.value = "";
                  }
                }}
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
                <div className="size-12 rounded-full shrink-0 grid place-items-center bg-[var(--surface-panel)] border border-[var(--color-border)] text-[var(--color-ink)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                    <path d="M7 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17 8.5h.5a3.5 3.5 0 1 1 0 7H7Z" />
                    <path d="M12 8v8" />
                    <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold m-0">{t("wizard.createTemplate.dropFile")}</p>
                  <p className="text-[var(--color-muted)] text-[0.85rem] mt-1 m-0">
                    {t("wizard.createTemplate.autoDetect")}
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
                  {t("wizard.createTemplate.browseFiles")}
                </Button>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="size-7 rounded-full bg-[var(--color-ink)] text-[var(--color-on-ink)] grid place-items-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <h4 className="m-0 text-sm font-semibold">{t("wizard.createTemplate.fieldConfig")}</h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="font-bold shrink-0"
                  onClick={addField}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t("wizard.createTemplate.addField")}
                </Button>
              </div>

              {triedSave && fields.length === 0 && (
                <p className="mt-3 text-[0.85rem] text-red-500">
                  {t("wizard.createTemplate.addFieldError")}
                </p>
              )}

              <div className="mt-4 border border-[var(--color-border)] rounded-[18px] overflow-hidden bg-[var(--surface-panel)] shadow-[0_10px_32px_rgba(28,28,28,0.05)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">{t("wizard.createTemplate.sourceHeader")}</TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">{t("wizard.createTemplate.fieldName")}</TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">{t("wizard.createTemplate.dataType")}</TableHead>
                      <TableHead className="text-center whitespace-nowrap px-4 py-2.5">{t("wizard.createTemplate.req")}</TableHead>
                      <TableHead className="whitespace-nowrap px-4 py-2.5">{t("wizard.createTemplate.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="px-4 py-2.5">
                          <Input
                            value={field.sourceHeader}
                            onChange={(event) => {
                              updateField(field.id, "sourceHeader", event.target.value);
                              setTriedSave(false);
                            }}
                            placeholder={t("wizard.createTemplate.sourceHeaderPlaceholder")}
                            className={cn(
                              "h-auto rounded-[10px] px-3 py-2 font-mono text-[0.9rem]",
                              triedSave && !field.sourceHeader.trim() && "border-red-500 ring-red-500/50",
                            )}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <Input
                            value={field.fieldName}
                            onChange={(event) => {
                              updateField(field.id, "fieldName", event.target.value);
                              setTriedSave(false);
                            }}
                            placeholder={t("wizard.createTemplate.fieldNamePlaceholder")}
                            className={cn(
                              "h-auto rounded-[10px] px-3 py-2",
                              triedSave && !field.fieldName.trim() && "border-red-500 ring-red-500/50",
                            )}
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
                            aria-label={t("wizard.createTemplate.deleteField", { name: field.fieldName })}
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
              <h4 className="m-0 text-sm">{t("wizard.createTemplate.schemaPreview")}</h4>
            </div>

            <div
              className="relative p-4 rounded-[16px] bg-[rgba(247,244,237,0.9)] border border-[var(--color-border)] text-[var(--color-ink)] overflow-auto"
            >
              <span
                className="absolute top-3 right-3 bg-[rgba(28,28,28,0.04)] px-[10px] py-1 rounded-[6px] text-[0.75rem] font-bold tracking-[0.05em] text-[var(--color-ink)]"
              >
                {t("wizard.createTemplate.json")}
              </span>
              <pre
                className="m-0 pt-7 text-[0.82rem] leading-[1.6] text-[var(--color-ink)] whitespace-pre overflow-auto max-h-full"
              >
                {schemaPreview}
              </pre>
            </div>

            <div
              className="p-3.5 border border-[var(--color-border)] rounded-[14px] bg-[var(--surface-panel-soft)] text-[var(--color-muted)] leading-snug text-[0.8rem]"
            >
              <strong>{t("wizard.createTemplate.tip")}</strong> {t("wizard.createTemplate.tipContent")}
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
          className="mx-0 mb-0 px-8 pt-5 pb-7 bg-[var(--surface-panel)] border-t border-[var(--color-border)] rounded-b-[22px] flex items-center justify-between"
        >
          <Button
            type="button"
            variant="ghost"
            className="text-[var(--color-muted)]"
            onClick={() => {
              setTemplateName("");
              setTemplateDescription("");
              setFields(initialTemplate ? fieldsFromSchema(initialTemplate.jsonSchema) : []);
              setTriedSave(false);
              setError(null);
            }}
          >
            {t("wizard.createTemplate.resetChanges")}
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
              {t("wizard.createTemplate.cancel")}
            </DialogClose>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="px-6 py-3"
            >
              {saving
                ? initialTemplate
                  ? t("wizard.createTemplate.updatingTemplate")
                  : t("wizard.createTemplate.savingTemplate")
                : initialTemplate
                  ? t("wizard.createTemplate.updateTemplate")
                  : t("wizard.createTemplate.saveTemplate")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
