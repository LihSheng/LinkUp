"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <Card className="rounded-[2rem] p-6 gap-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-0">
        <div>
          <Badge variant="outline" className="rounded-full">Schema setup</Badge>
          <h2 className="mt-3 text-2xl font-semibold">Define the target JSON shape</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pick a saved template from the sidebar or edit the schema here. The summary
            stays compact until you need to inspect the raw JSON.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Required: {summary.required}</Badge>
          <Badge variant="secondary">Top-level fields: {summary.properties}</Badge>
          <Badge variant="secondary">Nested groups: {summary.nested}</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 mt-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-4">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Schema template name"
              className="h-auto rounded-2xl px-4 py-3"
            />
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description"
              className="h-auto rounded-2xl px-4 py-3"
            />
          </div>
          <div className="rounded-[1.5rem] border border-border bg-card/70 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Validation status</p>
            <p className="mt-2">
              {parsedSchema ? "Schema JSON is valid and ready to save." : "Schema JSON needs fixing before save."}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-border bg-card/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Schema summary</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTemplate ? `Editing from template "${activeTemplate.name}".` : "Start from the sample employee schema and save a reusable template."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditor((current) => !current)}
            >
              {showEditor ? "Hide schema JSON" : "Edit schema JSON"}
            </Button>
          </div>
          {showEditor ? (
            <Textarea
              value={schemaText}
              onChange={(event) => setSchemaText(event.target.value)}
              className="code mt-4 min-h-80 rounded-[1.5rem] bg-[#fffdfa] px-4 py-4 text-sm outline-none"
              spellCheck={false}
            />
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
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
          >
            {saving ? "Saving schema..." : "Save schema template"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
