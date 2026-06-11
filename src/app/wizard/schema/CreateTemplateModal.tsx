"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

export type TemplateField = {
  id: string;
  sourceHeader: string;
  fieldName: string;
  dataType: "String" | "Number" | "Boolean" | "Date" | "Object";
  required: boolean;
};

const DEFAULT_TEMPLATE_NAME = "Custom template";
const DEFAULT_TEMPLATE_DESCRIPTION = "Define fields and schema for your mapping project";
const DEFAULT_TEMPLATE_FIELDS: TemplateField[] = [
  {
    id: "first-name",
    sourceHeader: "first_name",
    fieldName: "FirstName",
    dataType: "String",
    required: true,
  },
  {
    id: "user-id",
    sourceHeader: "user_id",
    fieldName: "UserID",
    dataType: "Number",
    required: true,
  },
  {
    id: "last-updated",
    sourceHeader: "last_updated",
    fieldName: "LastUpdate",
    dataType: "Date",
    required: false,
  },
  {
    id: "metadata",
    sourceHeader: "metadata",
    fieldName: "Metadata",
    dataType: "Object",
    required: false,
  },
];

type CreateTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
};

export function CreateTemplateModal({ isOpen, onClose, onSave }: CreateTemplateModalProps) {
  const [templateName, setTemplateName] = useState(DEFAULT_TEMPLATE_NAME);
  const [templateDescription, setTemplateDescription] = useState(DEFAULT_TEMPLATE_DESCRIPTION);
  const [fields, setFields] = useState<TemplateField[]>(DEFAULT_TEMPLATE_FIELDS);

  function resetDraft() {
    setTemplateName(DEFAULT_TEMPLATE_NAME);
    setTemplateDescription(DEFAULT_TEMPLATE_DESCRIPTION);
    setFields(DEFAULT_TEMPLATE_FIELDS);
  }

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

  const schemaPreview = `{\n${fields
    .map(
      (field, index) =>
        `  "${field.fieldName}": "${field.dataType}"${index === fields.length - 1 ? "" : ","}`,
    )
    .join("\n")}\n}`;

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
            Create Custom Template
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

            <div
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
                  color: "#767a79",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
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
                }}
                onClick={addField}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Field
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
                    <th>Source Header</th>
                    <th>Field Name</th>
                    <th>Data Type</th>
                    <th>Req.</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.id}>
                      <td style={{ fontFamily: "monospace" }}>{field.sourceHeader}</td>
                      <td>
                        <input
                          style={{
                            width: "100%",
                            minWidth: 0,
                            padding: "11px 12px",
                            border: "1px solid rgba(224, 220, 214, 0.96)",
                            borderRadius: "10px",
                            background: "rgba(252, 251, 248, 0.98)",
                            color: "var(--color-ink)",
                          }}
                          value={field.fieldName}
                          onChange={(event) =>
                            updateField(field.id, "fieldName", event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          style={{
                            width: "100%",
                            minWidth: 0,
                            padding: "11px 12px",
                            border: "1px solid rgba(224, 220, 214, 0.96)",
                            borderRadius: "10px",
                            background: "rgba(252, 251, 248, 0.98)",
                            color: "var(--color-ink)",
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
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          style={{ width: "20px", height: "20px", accentColor: "var(--color-ink)" }}
                          checked={field.required}
                          onChange={(event) =>
                            updateField(field.id, "required", event.target.checked)
                          }
                        />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            aria-label={`Edit ${field.fieldName}`}
                            style={{
                              border: 0,
                              background: "transparent",
                              cursor: "pointer",
                              color: "var(--color-ink)",
                              display: "grid",
                              placeItems: "center",
                              padding: "6px",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${field.fieldName}`}
                            onClick={() => removeField(field.id)}
                            style={{
                              border: 0,
                              background: "transparent",
                              cursor: "pointer",
                              color: "var(--color-ink)",
                              display: "grid",
                              placeItems: "center",
                              padding: "6px",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
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
            overflowY: "auto",
            padding: "28px 32px",
            background:
              "linear-gradient(180deg, rgba(242, 238, 236, 0.96), rgba(234, 229, 226, 0.98))",
            borderLeft: "1px solid var(--color-border)",
            display: "grid",
            alignContent: "start",
            gap: "24px",
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
              minHeight: "560px",
              padding: "28px 28px 32px",
              borderRadius: "16px",
              background:
                "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.06) 1px, transparent 0), #1e1d1c",
              backgroundSize: "22px 22px, auto",
              color: "#f7f2df",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              JSON
            </span>
            <pre style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.7 }}>{schemaPreview}</pre>
          </div>

          <div
            style={{
              padding: "20px",
              border: "1px solid rgba(236, 234, 228, 0.98)",
              borderRadius: "14px",
              background: "rgba(255, 255, 255, 0.58)",
              color: "#6f726f",
              lineHeight: 1.6,
              fontSize: "0.9rem",
            }}
          >
            <strong>PRO TIP:</strong> Objects can be nested using dot notation (e.g., user.address).
          </div>
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
          onClick={resetDraft}
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
            }}
            onClick={onSave}
          >
            Save Template
          </button>
        </div>
      </footer>
    </Modal>
  );
}
