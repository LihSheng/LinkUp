"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

import { Modal } from "@/components/Modal";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

import { CreateTemplateModal } from "./CreateTemplateModal";

type SchemaTemplate = {
  id: string;
  name: string;
  description?: string | null;
  jsonSchema: unknown;
};

type TemplateListResponse = {
  templates?: SchemaTemplate[];
};

type TemplateCreateResponse = {
  template: SchemaTemplate;
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
  const [selected, setSelected] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectedTemplateId, setInspectedTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SchemaTemplate | null>(null);

  const { data, mutate, isLoading, error } = useSWR("/api/schema-templates", swrFetcher, {
    revalidateOnFocus: false,
  });

  const templates = useMemo(() => data?.templates ?? [], [data?.templates]);
  const selectedTemplate = selected
    ? templates.find((template) => template.id === selected) ?? null
    : templates[0] ?? null;
  const inspectedTemplate = useMemo(
    () => templates.find((template) => template.id === inspectedTemplateId) ?? null,
    [inspectedTemplateId, templates],
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
          templates: [result.template, ...existing.filter((template) => template.id !== result.template.id)],
        };
      },
      { revalidate: false },
    );

    setSelected(result.template.id);
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
  }

  return (
    <div className="wizard-step-page">
      <div className="template-grid">
        {isLoading ? (
          <div className="template-card template-card-new" style={{ cursor: "default" }}>
            <h3 className="template-card-title">Loading templates</h3>
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
              onClick={() => setSelected(template.id)}
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
          <h3 className="template-card-title">Add New Template</h3>
          <p className="template-card-desc">Create a new saved schema.</p>
        </button>
      </div>

      <div className="template-footer">
        <div className="template-status">
          <span className={`template-selection-dot ${selectedTemplate ? "ready" : ""}`} />
          <p>
            {selectedTemplate
              ? `Using "${selectedTemplate.name}"`
              : "Select a schema template to continue"}
          </p>
        </div>
        <Link
          href="/wizard/workbook"
          className="primary-button"
          aria-disabled={!selectedTemplate}
          style={{
            pointerEvents: selectedTemplate ? "auto" : "none",
            opacity: selectedTemplate ? 1 : 0.5,
          }}
        >
          Continue to Upload
        </Link>
      </div>

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
          onClose={() => setInspectedTemplateId(null)}
        />
      ) : null}
    </div>
  );
}

function TemplateDetailsModal({
  template,
  onEdit,
  onClose,
}: {
  template: SchemaTemplate;
  onEdit: () => void;
  onClose: () => void;
}) {
  const fields = flattenJsonSchema(template.jsonSchema);

  return (
    <Modal isOpen={true} onClose={onClose}>
      <header
        style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "flex-start",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="dashboard-card-kicker" style={{ margin: 0 }}>
            Saved schema
          </p>
          <h3 style={{ margin: "6px 0 0", color: "var(--color-ink)" }}>{template.name}</h3>
          <p style={{ margin: "6px 0 0", color: "var(--color-muted)" }}>
            {template.description ?? "No description yet."}
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          style={{
            minHeight: "40px",
            padding: "0 16px",
            marginRight: "8px",
          }}
          onClick={onEdit}
        >
          Edit template
        </button>
        <button
          type="button"
          aria-label="Close schema details"
          onClick={onClose}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "9999px",
            border: 0,
            background: "transparent",
            color: "var(--color-ink)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          minHeight: 0,
          flex: "1 1 auto",
        }}
      >
        <section style={{ padding: "24px", minHeight: 0, overflow: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <h4 style={{ margin: 0 }}>Columns</h4>
            <span style={{ color: "var(--color-muted)" }}>{fields.length} fields</span>
          </div>

          <div
            style={{
              display: "grid",
              gap: "10px",
              border: "1px solid var(--color-border)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) 0.6fr 0.4fr",
                gap: "12px",
                padding: "12px 16px",
                background: "rgba(28, 28, 28, 0.03)",
                color: "var(--color-muted)",
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <span>Field</span>
              <span>Type</span>
              <span>Required</span>
            </div>
            {fields.length > 0 ? (
              fields.map((field) => (
                <div
                  key={field.path}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.4fr) 0.6fr 0.4fr",
                    gap: "12px",
                    padding: "12px 16px",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  <span style={{ color: "var(--color-ink)" }}>{field.path}</span>
                  <span style={{ color: "var(--color-muted)" }}>{field.type}</span>
                  <span style={{ color: "var(--color-muted)" }}>{field.required ? "Yes" : "No"}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: "16px", color: "var(--color-muted)" }}>No fields found.</div>
            )}
          </div>
        </section>

        <aside
          style={{
            padding: "24px",
            borderLeft: "1px solid var(--color-border)",
            background: "rgba(252, 251, 248, 0.98)",
            minHeight: 0,
            overflow: "hidden",
            display: "grid",
            gap: "12px",
          }}
        >
          <h4 style={{ marginTop: 0 }}>Schema JSON</h4>
          <pre
            style={{
              margin: 0,
              padding: "16px",
              borderRadius: "14px",
              background: "rgba(247, 244, 237, 0.9)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink)",
              overflow: "auto",
              fontSize: "0.82rem",
              lineHeight: 1.7,
              whiteSpace: "pre",
              wordBreak: "break-word",
              maxHeight: "calc(100vh - 240px)",
            }}
          >
            {JSON.stringify(template.jsonSchema, null, 2)}
          </pre>
        </aside>
      </div>
    </Modal>
  );
}
