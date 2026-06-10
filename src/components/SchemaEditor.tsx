"use client";

import { useMemo, useState } from "react";

type SchemaTemplate = {
  id: string;
  name: string;
  description?: string | null;
  jsonSchema: unknown;
};

type SchemaEditorProps = {
  activeTemplate: SchemaTemplate | null;
  onCreateTemplate: (payload: {
    name: string;
    description?: string;
    jsonSchema: unknown;
  }) => Promise<void>;
};

const starterSchema = `{
  "type": "object",
  "required": ["employee_no", "name"],
  "properties": {
    "employee_no": { "type": "string" },
    "name": { "type": "string" },
    "join_date": { "type": "string" },
    "salary": {
      "type": "object",
      "properties": {
        "basic": { "type": "number" }
      }
    }
  }
}`;

function summariseSchema(schema: unknown) {
  if (!schema || typeof schema !== "object") {
    return { required: 0, properties: 0, nested: 0 };
  }

  const root = schema as {
    required?: unknown;
    properties?: Record<string, unknown>;
  };
  const properties = root.properties ? Object.keys(root.properties) : [];
  const nested = properties.filter((key) => {
    const value = root.properties?.[key];
    return Boolean(value && typeof value === "object" && "properties" in (value as object));
  });

  return {
    required: Array.isArray(root.required) ? root.required.length : 0,
    properties: properties.length,
    nested: nested.length,
  };
}

export function SchemaEditor({ activeTemplate, onCreateTemplate }: SchemaEditorProps) {
  const [name, setName] = useState(activeTemplate?.name ?? "Employee import schema");
  const [description, setDescription] = useState(
    activeTemplate?.description ??
      "Initial employee onboarding schema for Excel uploads.",
  );
  const [schemaText, setSchemaText] = useState(
    activeTemplate ? JSON.stringify(activeTemplate.jsonSchema, null, 2) : starterSchema,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(true);

  const parsedSchema = useMemo(() => {
    try {
      return JSON.parse(schemaText) as unknown;
    } catch {
      return null;
    }
  }, [schemaText]);

  const summary = summariseSchema(parsedSchema ?? activeTemplate?.jsonSchema ?? null);

  return (
    <div className="panel rounded-[2rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="badge">Schema setup</p>
          <h2 className="mt-3 text-2xl font-semibold">Define the target JSON shape</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Pick a saved template from the sidebar or edit the schema here. The summary
            stays compact until you need to inspect the raw JSON.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge">Required: {summary.required}</span>
          <span className="badge">Top-level fields: {summary.properties}</span>
          <span className="badge">Nested groups: {summary.nested}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid gap-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            placeholder="Schema template name"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 outline-none"
            placeholder="Short description"
          />
        </div>
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Validation status</p>
          <p className="mt-2">
            {parsedSchema ? "Schema JSON is valid and ready to save." : "Schema JSON needs fixing before save."}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Schema summary</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {activeTemplate ? `Editing from template "${activeTemplate.name}".` : "Start from the sample employee schema and save a reusable template."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEditor((current) => !current)}
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
          >
            {showEditor ? "Hide schema JSON" : "Edit schema JSON"}
          </button>
        </div>
        {showEditor ? (
          <textarea
            value={schemaText}
            onChange={(event) => setSchemaText(event.target.value)}
            className="code mt-4 min-h-80 w-full rounded-[1.5rem] border border-[var(--line)] bg-[#fffdfa] px-4 py-4 text-sm outline-none"
            spellCheck={false}
          />
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);

            try {
              const parsed = JSON.parse(schemaText);
              await onCreateTemplate({ name, description, jsonSchema: parsed });
            } catch (caughtError) {
              setError(
                caughtError instanceof Error
                  ? caughtError.message
                  : "Unable to create schema template.",
              );
            } finally {
              setSaving(false);
            }
          }}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px] disabled:opacity-50"
        >
          {saving ? "Saving schema..." : "Save schema template"}
        </button>
      </div>
    </div>
  );
}
