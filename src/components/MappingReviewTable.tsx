"use client";

import { useState } from "react";
import clsx from "clsx";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ColumnProfile,
  FieldMapping,
  TargetField,
  TransformRule,
} from "@/lib/mapping/mapping.types";

type MappingReviewTableProps = {
  targetFields: TargetField[];
  columns: ColumnProfile[];
  mappings: FieldMapping[];
  onChange: (nextMappings: FieldMapping[]) => void;
};

type MappingFilter = "all" | "required" | "unmapped" | "low" | "confirmed" | "duplicates";

const transformOptions: TransformRule[] = [
  "none",
  "trim",
  "to_number",
  "parse_date",
  "uppercase",
  "lowercase",
];

function getConfidenceTone(confidence: number) {
  if (confidence >= 0.85) {
    return {
      label: `${Math.round(confidence * 100)}% · High confidence`,
      variant: "default" as const,
      className:
        "border-[var(--success)]/30 bg-[rgba(45,106,79,0.12)] text-[var(--success)]",
    };
  }

  if (confidence >= 0.5) {
    return {
      label: `${Math.round(confidence * 100)}% · Needs review`,
      variant: "secondary" as const,
      className:
        "border-[var(--warning)]/30 bg-[rgba(255,214,102,0.18)] text-[var(--warning)]",
    };
  }

  return {
    label: `${Math.round(confidence * 100)}% · Low confidence`,
    variant: "destructive" as const,
    className: "border-[var(--danger)]/20 bg-[rgba(176,0,32,0.08)] text-[var(--danger)]",
  };
}

export function MappingReviewTable({
  targetFields,
  columns,
  mappings,
  onChange,
}: MappingReviewTableProps) {
  const [filter, setFilter] = useState<MappingFilter>("all");
  const mappingByPath = new Map(mappings.map((mapping) => [mapping.targetPath, mapping]));
  const columnByName = new Map(columns.map((column) => [column.name, column]));

  const duplicateSources = mappings
    .filter((mapping) => mapping.sourceColumn)
    .map((mapping) => mapping.sourceColumn as string)
    .filter((source, index, all) => all.indexOf(source) !== index);

  const updateMapping = (
    targetPath: string,
    updater: (current: FieldMapping) => FieldMapping,
  ) => {
    const existing = mappingByPath.get(targetPath) ?? {
      targetPath,
      sourceColumn: null,
      confidence: 0,
      transform: "none",
      reason: "",
      constantValue: null,
    };

    const nextMapping = updater(existing);
    const nextMappings = mappingByPath.has(targetPath)
      ? mappings.map((item) => (item.targetPath === targetPath ? nextMapping : item))
      : [...mappings, nextMapping];

    onChange(nextMappings);
  };

  const rows = targetFields.map((field) => {
    const mapping =
      mappingByPath.get(field.path) ??
      ({
        targetPath: field.path,
        sourceColumn: null,
        confidence: 0,
        transform: "none",
        reason: "",
        constantValue: null,
      } satisfies FieldMapping);
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
      .slice(0, 3)
      .map((value) => String(value)) ?? [];

    let status: "blocking" | "review" | "confirmed" | "optional" = "optional";
    let statusLabel = "Optional";
    let statusNote = "Not mapped yet.";

    if (field.required && !hasAssignment) {
      status = "blocking";
      statusLabel = "Required";
      statusNote = "This field must be mapped before JSON can be generated.";
    } else if (duplicate) {
      status = "review";
      statusLabel = "Duplicate source";
      statusNote = "This source column is mapped to more than one target field.";
    } else if (!hasAssignment) {
      status = "optional";
      statusLabel = "Optional";
      statusNote = "You can leave this empty if the field is not needed.";
    } else if (confidence < 0.5) {
      status = "review";
      statusLabel = "Low confidence";
      statusNote = "The suggestion is weak and should be checked manually.";
    } else if (confidence < 0.85) {
      status = "review";
      statusLabel = "Needs review";
      statusNote = "This mapping looks plausible but still needs confirmation.";
    } else {
      status = "confirmed";
      statusLabel = "Looks good";
      statusNote = "This suggestion is strong enough for a quick confirmation pass.";
    }

    return {
      field,
      mapping,
      hasAssignment,
      duplicate,
      confidence,
      sourceProfile,
      samples,
      status,
      statusLabel,
      statusNote,
    };
  });

  const filteredRows = rows.filter((row) => {
    switch (filter) {
      case "required":
        return row.field.required;
      case "unmapped":
        return !row.hasAssignment;
      case "low":
        return row.status === "review";
      case "confirmed":
        return row.status === "confirmed";
      case "duplicates":
        return row.duplicate;
      default:
        return true;
    }
  });

  const filterCounts = {
    all: rows.length,
    required: rows.filter((row) => row.field.required).length,
    unmapped: rows.filter((row) => !row.hasAssignment).length,
    low: rows.filter((row) => row.status === "review").length,
    confirmed: rows.filter((row) => row.status === "confirmed").length,
    duplicates: rows.filter((row) => row.duplicate).length,
  };

  const filters: Array<{ key: MappingFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "required", label: "Required" },
    { key: "unmapped", label: "Unmapped" },
    { key: "low", label: "Low confidence" },
    { key: "confirmed", label: "Confirmed" },
    { key: "duplicates", label: "Duplicates" },
  ];

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "blocking": return "destructive" as const;
      case "review": return "secondary" as const;
      case "confirmed": return "default" as const;
      default: return "outline" as const;
    }
  };

  return (
    <Card className="rounded-[2rem] p-6 gap-0">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 p-0">
        <div>
          <Badge variant="outline" className="rounded-full">Mapping review</Badge>
          <h2 className="mt-3 text-2xl font-semibold">Resolve what needs attention</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review required fields first, then check low-confidence or duplicate mappings.
            Details stay expandable so the main pass feels lighter.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">Fields: {targetFields.length}</Badge>
          <Badge variant="secondary">Columns: {columns.length}</Badge>
          <Badge variant="secondary">Duplicates: {filterCounts.duplicates}</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 mt-5">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={filter === item.key ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setFilter(item.key)}
            >
              {item.label} · {filterCounts[item.key]}
            </Button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              onChange(
                mappings.map((mapping) => {
                  const field = targetFields.find((item) => item.path === mapping.targetPath);

                  if (field?.type !== "string" || !mapping.sourceColumn) {
                    return mapping;
                  }

                  return { ...mapping, transform: "trim" };
                }),
              );
            }}
          >
            Apply trim to text fields
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              onChange(
                targetFields.map((field) => ({
                  targetPath: field.path,
                  sourceColumn: null,
                  confidence: 0,
                  transform: "none",
                  reason: "",
                  constantValue: null,
                })),
              );
            }}
          >
            Reset all suggestions
          </Button>
        </div>

        <div className="mt-6 grid gap-4">
          {filteredRows.map((row) => {
            const confidenceTone = getConfidenceTone(row.confidence);

            return (
              <article
                key={row.field.path}
                className={clsx(
                  "rounded-[1.6rem] border p-5 transition",
                  row.status === "blocking" &&
                    "border-[var(--danger)]/25 bg-[rgba(176,0,32,0.05)]",
                  row.status === "review" &&
                    "border-[var(--warning)]/30 bg-[rgba(255,214,102,0.14)]",
                  row.status === "confirmed" &&
                    "border-[var(--success)]/20 bg-[rgba(45,106,79,0.06)]",
                  row.status === "optional" && "border-border bg-card/80",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{row.field.path}</h3>
                      <Badge variant="outline" className="rounded-full">{row.field.type}</Badge>
                      {row.field.required ? (
                        <Badge variant="destructive" className="rounded-full">Required</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{row.statusNote}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={statusBadgeVariant(row.status)}
                      className={clsx(
                        "rounded-full",
                        row.status !== "optional" && row.status !== "confirmed" && row.status !== "blocking" && row.status !== "review" && "border-border bg-white text-muted-foreground",
                      )}
                    >
                      {row.statusLabel}
                    </Badge>
                    <Badge
                      variant={confidenceTone.variant}
                      className={clsx("rounded-full", confidenceTone.className)}
                    >
                      {confidenceTone.label}
                    </Badge>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_220px]">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Suggested source
                    </label>
                    <Select
                      value={row.mapping.sourceColumn ?? ""}
                      onValueChange={(value) => {
                        updateMapping(row.field.path, (current) => ({
                          ...current,
                          sourceColumn: value || null,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full mt-2 rounded-2xl px-4 py-3 h-auto">
                        <SelectValue placeholder="Unmapped" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unmapped</SelectItem>
                        {columns.map((column) => (
                          <SelectItem key={column.name} value={column.name}>
                            {column.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.samples.length > 0 ? (
                        row.samples.map((sample) => (
                          <span
                            key={`${row.field.path}-${sample}`}
                            className="rounded-full bg-[rgba(20,33,61,0.06)] px-3 py-1 text-xs text-muted-foreground"
                          >
                            {sample}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Sample values will appear here once a source column is selected.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Transform
                      </label>
                      <Select
                        value={row.mapping.transform ?? "none"}
                        onValueChange={(value) => {
                          updateMapping(row.field.path, (current) => ({
                            ...current,
                            transform: value as TransformRule,
                          }));
                        }}
                      >
                        <SelectTrigger className="w-full mt-2 rounded-2xl px-4 py-3 h-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {transformOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Expected type
                      </label>
                      <div className="mt-2 rounded-2xl border border-input bg-background px-4 py-3 text-sm text-muted-foreground">
                        {row.field.type}
                        {row.sourceProfile ? (
                          <span className="block text-xs text-muted-foreground">
                            Source looks like {row.sourceProfile.detectedType}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Constant value
                    </label>
                    <input
                      value={row.mapping.constantValue ?? ""}
                      onChange={(event) => {
                        updateMapping(row.field.path, (current) => ({
                          ...current,
                          constantValue: event.target.value || null,
                        }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                      placeholder="Optional default"
                    />
                  </div>
                </div>

                <details className="mt-4 rounded-[1.2rem] border border-border bg-card/70 px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold">
                    Why this match? Manual notes
                  </summary>
                  <textarea
                    value={row.mapping.reason ?? ""}
                    onChange={(event) => {
                      updateMapping(row.field.path, (current) => ({
                        ...current,
                        reason: event.target.value,
                      }));
                    }}
                    className="mt-3 min-h-24 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                    placeholder="Add notes, rationale, or override comments."
                  />
                </details>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
