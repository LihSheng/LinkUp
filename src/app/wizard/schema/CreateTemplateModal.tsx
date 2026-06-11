"use client";

import { useRef, useState } from "react";

import { Modal } from "@/components/Modal";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

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
    type: "object",
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

      nextSchema.type = "object";
      nextSchema.properties ??= {};
      cursor.properties[segment] = nextSchema;
      cursor = nextSchema;
    }
  }

  return root;
}

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <header
        style={{
          padding: "18px 32px",
          background: "rgba(255, 255, 255, 0.66)",
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 id="template-modal-title" style={{ margin: 0, fontSize: "1.05rem", lineHeight: 1.2 }}>
            {initialTemplate ? "Edit Saved Template" : "Create Custom Template"}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.92rem", lineHeight: 1.45 }}>
            {templateDescription}
          </p>
        </div>
        <button
          type="button"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "9999px",
            border: 0,
            background: "transparent",
            color: "var(--color-ink)",
            display: "inline-grid",
            placeItems: "center",
            flex: "0 0 auto",
            cursor: "pointer",
          }}
          aria-label="Close custom template modal"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </header>

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            minHeight: 0,
            overflowY: "auto",
            padding: "28px 32px 56px",
            background: "rgba(255, 255, 255, 0.32)",
          }}
        >
          <section>
            <div
              style={{
                display: "flex",
                gap: "14px",
                justifyContent: "space-between",
                alignItems: "stretch",
              }}
            >
              <label style={{ display: "grid", gap: "8px", flex: "1 1 0" }}>
                <span>Template Name</span>
                <input
                  style={{
                    width: "100%",
                    minWidth: 0,
                    padding: "14px 16px",
                    border: "1px solid rgba(224, 220, 214, 0.96)",
                    borderRadius: "12px",
                    background: "rgba(252, 251, 248, 0.98)",
                    color: "var(--color-ink)",
                  }}
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: "8px", flex: "1.4 1 0" }}>
                <span>Template Description</span>
                <input
                  style={{
                    width: "100%",
                    minWidth: 0,
                    padding: "14px 16px",
                    border: "1px solid rgba(224, 220, 214, 0.96)",
                    borderRadius: "12px",
                    background: "rgba(252, 251, 248, 0.98)",
                    color: "var(--color-ink)",
                  }}
                  value={templateDescription}
                  onChange={(event) => setTemplateDescription(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section style={{ marginTop: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "9999px",
                  background: "var(--color-ink)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                1
              </span>
              <h4 style={{ margin: 0 }}>Upload Sample</h4>
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
              style={{
                marginTop: "18px",
                padding: "24px",
                border: "2px dashed rgba(236, 234, 228, 0.92)",
                borderRadius: "18px",
                background:
                  "linear-gradient(180deg, rgba(252, 251, 248, 0.94), rgba(247, 244, 237, 0.42))",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "9999px",
                  display: "grid",
                  placeItems: "center",
                  flex: "0 0 auto",
                  background: "rgba(255, 255, 255, 0.92)",
                  border: "1px solid rgba(236, 234, 228, 0.92)",
                  color: "var(--color-ink)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                  <path d="M7 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17 8.5h.5a3.5 3.5 0 1 1 0 7H7Z" />
                  <path d="M12 8v8" />
                  <path d="m8.5 11.5 3.5-3.5 3.5 3.5" />
                </svg>
              </div>
              <div style={{ flex: "1 1 auto", textAlign: "left" }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Drop a .csv or .xlsx file here</p>
                <p style={{ color: "#6f726f", fontSize: "0.85rem", margin: "4px 0 0" }}>
                  Auto-detect fields and data types
                </p>
              </div>
              <button
                type="button"
                style={{
                  minHeight: "40px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(224, 220, 214, 0.96)",
                  background: "rgba(255, 255, 255, 0.9)",
                  color: "var(--color-ink)",
                  cursor: "pointer",
                  flex: "0 0 auto",
                  fontSize: "0.9rem",
                }}
              >
                Browse Files
              </button>
            </div>
          </section>

          <section style={{ marginTop: "40px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "9999px",
                    background: "var(--color-ink)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  2
                </span>
                <h4 style={{ margin: 0 }}>Field Configuration</h4>
              </div>
              <button
                type="button"
                className="template-modal-add"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  border: 0,
                  background: "transparent",
                  color: "var(--color-ink)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexWrap: "nowrap",
                  minWidth: "max-content",
                }}
                onClick={addField}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Field</span>
              </button>
            </div>

            <div
              style={{
                marginTop: "20px",
                border: "1px solid var(--color-border)",
                borderRadius: "18px",
                overflow: "hidden",
                background: "rgba(255, 255, 255, 0.92)",
                boxShadow: "0 10px 32px rgba(28, 28, 28, 0.05)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>
                      Source Header
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>
                      Field Name
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>
                      Data Type
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                      Req.
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.id}>
                      <td style={{ padding: "12px 16px" }}>
                        <input
                          style={{
                            width: "100%",
                            minWidth: 0,
                            padding: "11px 12px",
                            border: "1px solid rgba(224, 220, 214, 0.96)",
                            borderRadius: "10px",
                            background: "rgba(252, 251, 248, 0.98)",
                            color: "var(--color-ink)",
                            boxSizing: "border-box",
                            fontFamily: "monospace",
                            fontSize: "0.9rem",
                          }}
                          value={field.sourceHeader}
                          onChange={(event) =>
                            updateField(field.id, "sourceHeader", event.target.value)
                          }
                        />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <input
                          style={{
                            width: "100%",
                            minWidth: 0,
                            padding: "11px 12px",
                            border: "1px solid rgba(224, 220, 214, 0.96)",
                            borderRadius: "10px",
                            background: "rgba(252, 251, 248, 0.98)",
                            color: "var(--color-ink)",
                            boxSizing: "border-box",
                          }}
                          value={field.fieldName}
                          onChange={(event) => updateField(field.id, "fieldName", event.target.value)}
                        />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <select
                          style={{
                            width: "100%",
                            minWidth: 0,
                            padding: "11px 12px",
                            border: "1px solid rgba(224, 220, 214, 0.96)",
                            borderRadius: "10px",
                            background: "rgba(252, 251, 248, 0.98)",
                            color: "var(--color-ink)",
                            boxSizing: "border-box",
                          }}
                          value={field.dataType}
                          onChange={(event) =>
                            updateField(
                              field.id,
                              "dataType",
                              event.target.value as TemplateField["dataType"],
                            )
                          }
                        >
                          <option value="String">String</option>
                          <option value="Number">Number</option>
                          <option value="Boolean">Boolean</option>
                          <option value="Date">Date</option>
                          <option value="Object">Object</option>
                        </select>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          style={{ width: "20px", height: "20px", accentColor: "var(--color-ink)" }}
                          checked={field.required}
                          onChange={(event) => updateField(field.id, "required", event.target.checked)}
                        />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            aria-label={`Delete ${field.fieldName}`}
                            onClick={() => removeField(field.id)}
                            style={{
                              border: 0,
                              background: "transparent",
                              cursor: "pointer",
                              color: "#ba1a1a",
                              display: "grid",
                              placeItems: "center",
                              padding: "6px",
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              width="18"
                              height="18"
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
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside
          style={{
            minHeight: 0,
            overflow: "auto",
            padding: "24px 28px",
            background: "rgba(252, 251, 248, 0.98)",
            borderLeft: "1px solid var(--color-border)",
            display: "grid",
            alignContent: "start",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="m8 9-3 3 3 3" />
              <path d="m16 9 3 3-3 3" />
            </svg>
            <h4 style={{ margin: 0 }}>Schema Preview</h4>
          </div>

          <div
            style={{
              position: "relative",
              padding: "22px 22px 24px",
              borderRadius: "16px",
              background: "rgba(247, 244, 237, 0.9)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink)",
              overflow: "auto",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(28, 28, 28, 0.04)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "var(--color-ink)",
              }}
            >
              JSON
            </span>
            <pre
              style={{
                margin: 0,
                paddingTop: "28px",
                fontSize: "0.85rem",
                lineHeight: 1.7,
                color: "var(--color-ink)",
                whiteSpace: "pre",
                overflow: "auto",
                maxHeight: "100%",
              }}
            >
              {schemaPreview}
            </pre>
          </div>

          <div
            style={{
              padding: "14px 16px",
              border: "1px solid rgba(236, 234, 228, 0.98)",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.58)",
              color: "#6f726f",
              lineHeight: 1.45,
              fontSize: "0.82rem",
            }}
          >
            <strong>Tip:</strong> Use dot notation for nested fields like user.address.
          </div>

          {error ? (
            <div
              style={{
                padding: "14px 16px",
                border: "1px solid rgba(185, 28, 28, 0.18)",
                borderRadius: "14px",
                background: "rgba(254, 242, 242, 0.72)",
                color: "#991b1b",
                lineHeight: 1.45,
                fontSize: "0.82rem",
              }}
            >
              {error}
            </div>
          ) : null}
        </aside>
      </div>

      <footer
        style={{
          padding: "18px 32px",
          background: "rgba(255, 255, 255, 0.66)",
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "center",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <button
          type="button"
          style={{
            minHeight: "48px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border: 0,
            background: "transparent",
            color: "#6f726f",
            cursor: "pointer",
          }}
          onClick={() => {
            setTemplateName(DEFAULT_TEMPLATE_NAME);
            setTemplateDescription(DEFAULT_TEMPLATE_DESCRIPTION);
            setFields(initialTemplate ? fieldsFromSchema(initialTemplate.jsonSchema) : []);
            setError(null);
          }}
        >
          Reset Changes
        </button>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            type="button"
            style={{
              minHeight: "48px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 24px",
              borderRadius: "12px",
              border: "1px solid rgba(224, 220, 214, 0.96)",
              background: "rgba(255, 255, 255, 0.9)",
              color: "var(--color-ink)",
              cursor: "pointer",
            }}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            style={{
              minHeight: "48px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 24px",
              borderRadius: "12px",
              border: 0,
              background: "var(--color-ink)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              opacity: saving ? 0.8 : 1,
            }}
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving
              ? initialTemplate
                ? "Updating Template..."
                : "Saving Template..."
              : initialTemplate
                ? "Update Template"
                : "Save Template"}
          </button>
        </div>
      </footer>
    </Modal>
  );
}
