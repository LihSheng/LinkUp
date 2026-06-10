"use client";

import { useState } from "react";
import clsx from "clsx";

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
      className:
        "border-[var(--success)]/30 bg-[rgba(45,106,79,0.12)] text-[var(--success)]",
    };
  }

  if (confidence >= 0.5) {
    return {
      label: `${Math.round(confidence * 100)}% · Needs review`,
      className:
        "border-[var(--warning)]/30 bg-[rgba(255,214,102,0.18)] text-[var(--warning)]",
    };
  }

  return {
    label: `${Math.round(confidence * 100)}% · Low confidence`,
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

  return (
    <div className="panel rounded-[2rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="badge">Mapping review</p>
          <h2 className="mt-3 text-2xl font-semibold">Resolve what needs attention</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Review required fields first, then check low-confidence or duplicate mappings.
            Details stay expandable so the main pass feels lighter.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge">Fields: {targetFields.length}</span>
          <span className="badge">Columns: {columns.length}</span>
          <span className="badge">Duplicates: {filterCounts.duplicates}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              filter === item.key
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)]/50",
            )}
          >
            {item.label} · {filterCounts[item.key]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
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
          className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Apply trim to text fields
        </button>
        <button
          type="button"
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
          className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Reset all suggestions
        </button>
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
                row.status === "optional" && "border-[var(--line)] bg-white/80",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{row.field.path}</h3>
                    <span className="badge">{row.field.type}</span>
                    {row.field.required ? (
                      <span className="badge border-[var(--danger)]/20 text-[var(--danger)]">
                        Required
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{row.statusNote}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      row.status === "blocking" &&
                        "border-[var(--danger)]/20 bg-[rgba(176,0,32,0.08)] text-[var(--danger)]",
                      row.status === "review" &&
                        "border-[var(--warning)]/30 bg-[rgba(255,214,102,0.18)] text-[var(--warning)]",
                      row.status === "confirmed" &&
                        "border-[var(--success)]/30 bg-[rgba(45,106,79,0.12)] text-[var(--success)]",
                      row.status === "optional" && "border-[var(--line)] bg-white text-[var(--muted)]",
                    )}
                  >
                    {row.statusLabel}
                  </span>
                  <span
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      confidenceTone.className,
                    )}
                  >
                    {confidenceTone.label}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_220px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Suggested source
                  </label>
                  <select
                    value={row.mapping.sourceColumn ?? ""}
                    onChange={(event) => {
                      updateMapping(row.field.path, (current) => ({
                        ...current,
                        sourceColumn: event.target.value || null,
                      }));
                    }}
                    className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                  >
                    <option value="">Unmapped</option>
                    {columns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.samples.length > 0 ? (
                      row.samples.map((sample) => (
                        <span
                          key={`${row.field.path}-${sample}`}
                          className="rounded-full bg-[rgba(20,33,61,0.06)] px-3 py-1 text-xs text-[var(--muted)]"
                        >
                          {sample}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--muted)]">
                        Sample values will appear here once a source column is selected.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Transform
                    </label>
                    <select
                      value={row.mapping.transform ?? "none"}
                      onChange={(event) => {
                        updateMapping(row.field.path, (current) => ({
                          ...current,
                          transform: event.target.value as TransformRule,
                        }));
                      }}
                      className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                    >
                      {transformOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Expected type
                    </label>
                    <div className="mt-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
                      {row.field.type}
                      {row.sourceProfile ? (
                        <span className="block text-xs text-[var(--muted)]">
                          Source looks like {row.sourceProfile.detectedType}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
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
                    className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                    placeholder="Optional default"
                  />
                </div>
              </div>

              <details className="mt-4 rounded-[1.2rem] border border-[var(--line)] bg-white/70 px-4 py-3">
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
                  className="mt-3 min-h-24 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm"
                  placeholder="Add notes, rationale, or override comments."
                />
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
