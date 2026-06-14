"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        "border-[var(--color-success)]/30 bg-[rgba(45,106,79,0.12)] text-[var(--color-success)]",
    };
  }

  if (confidence >= 0.5) {
    return {
      label: `${Math.round(confidence * 100)}% · Needs review`,
      variant: "secondary" as const,
      className:
        "border-[var(--color-warning)]/30 bg-[rgba(255,214,102,0.18)] text-[var(--color-warning)]",
    };
  }

  return {
    label: `${Math.round(confidence * 100)}% · Low confidence`,
    variant: "destructive" as const,
    className: "border-[var(--color-error)]/20 bg-[rgba(176,0,32,0.08)] text-[var(--color-error)]",
  };
}

export function MappingReviewTable({
  targetFields,
  columns,
  mappings,
  onChange,
}: MappingReviewTableProps) {
  const { t } = useTranslation();
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [showConstantValue, setShowConstantValue] = useState<Set<string>>(new Set());
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

  const acceptMapping = (targetPath: string) => {
    updateMapping(targetPath, (current) => ({
      ...current,
      confidence: 0.95,
    }));
  };

  const toggleDetails = (targetPath: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev);
      if (next.has(targetPath)) {
        next.delete(targetPath);
      } else {
        next.add(targetPath);
      }
      return next;
    });
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

    let status: "blocking" | "review" | "confirmed" | "optional" = "optional";

    if (field.required && !hasAssignment) {
      status = "blocking";
    } else if (duplicate) {
      status = "review";
    } else if (!hasAssignment) {
      status = "optional";
    } else if (confidence < 0.5) {
      status = "review";
    } else if (confidence < 0.85) {
      status = "review";
    } else {
      status = "confirmed";
    }

    return {
      field,
      mapping,
      hasAssignment,
      duplicate,
      confidence,
      sourceProfile,
      status,
    };
  });

  const needsReviewCount = rows.filter(
    (row) => row.status === "blocking" || row.status === "review",
  ).length;

  function hasTypeMismatch(expectedType: string, detectedType: string | undefined): boolean {
    if (!detectedType || detectedType === "mixed" || detectedType === "empty") return false;
    const normalize = (t: string) => {
      const lower = t.toLowerCase();
      if (lower === "integer" || lower === "float" || lower === "double") return "number";
      if (lower === "text") return "string";
      if (lower === "datetime" || lower === "timestamp") return "date";
      if (lower === "bool") return "boolean";
      return lower;
    };
    return normalize(expectedType) !== normalize(detectedType);
  }

  const rowColor = (row: (typeof rows)[number]) => {
    if (row.status === "blocking") return "bg-[rgba(176,0,32,0.06)]";
    if (row.status === "review") return "bg-[rgba(255,214,102,0.1)]";
    return "";
  };

  const issueText = (row: (typeof rows)[number]) => {
    const issues: string[] = [];
    if (row.status === "blocking") issues.push(t("legacy.reviewTable.requiredFieldNotMapped"));
    if (row.duplicate) issues.push(t("legacy.reviewTable.duplicateSource"));
    if (row.sourceProfile) {
      const mismatch = hasTypeMismatch(row.field.type, row.sourceProfile.detectedType);
      if (mismatch) issues.push(`Source looks ${row.sourceProfile.detectedType}`);
    }
    return issues.length > 0 ? issues.join("; ") : null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--color-muted)]">
            {t("legacy.reviewTable.title")}
          </span>
          <span className="text-xs text-[var(--color-ink-40)]">&middot;</span>
          <span className="text-xs text-[var(--color-muted)]">
          {t("legacy.reviewTable.fieldsAttention", { fields: String(targetFields.length), attention: String(needsReviewCount) })}
        </span>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--color-border)]">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-[var(--color-ink-03)]">
                <TableHead className="w-[160px] min-w-[120px]">{t("legacy.reviewTable.targetField")}</TableHead>
                <TableHead className="w-[70px]">{t("legacy.reviewTable.type")}</TableHead>
                <TableHead className="min-w-[180px] w-[220px]">{t("legacy.reviewTable.suggestedSource")}</TableHead>
                <TableHead className="w-[120px]">{t("legacy.reviewTable.transform")}</TableHead>
                <TableHead className="w-[110px]">{t("legacy.reviewTable.confidence")}</TableHead>
                <TableHead className="w-auto min-w-[140px]">{t("legacy.reviewTable.issue")}</TableHead>
                <TableHead className="w-[120px]">{t("legacy.reviewTable.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-[var(--color-muted)]">
                    {t("legacy.reviewTable.noFields")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.flatMap((row) => {
                  const confidenceTone = getConfidenceTone(row.confidence);
                  const issue = issueText(row);
                  const hasConst = showConstantValue.has(row.field.path);

                  return [
                    <TableRow
                      key={row.field.path}
                      className={clsx("group", rowColor(row))}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm">{row.field.path}</span>
                          {row.field.required ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-error)]">
                              *
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full text-xs font-normal">
                          {row.field.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={row.mapping.sourceColumn ?? ""}
                            onValueChange={(value) => {
                              updateMapping(row.field.path, (current) => ({
                                ...current,
                                sourceColumn: value || null,
                              }));
                            }}
                          >
                            <SelectTrigger className="h-8 w-full min-w-[120px] max-w-[200px] rounded-full px-3 text-xs">
                              <SelectValue placeholder={t("legacy.reviewTable.selectSource")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">{t("legacy.reviewTable.unmapped")}</SelectItem>
                              {columns.map((column) => (
                                <SelectItem key={column.name} value={column.name}>
                                  {column.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {hasConst ? (
                            <div className="flex items-center gap-1">
                              <input
                                value={row.mapping.constantValue ?? ""}
                                onChange={(event) => {
                                  updateMapping(row.field.path, (current) => ({
                                    ...current,
                                    constantValue: event.target.value || null,
                                  }));
                                }}
                                className="h-8 w-20 min-w-[60px] max-w-[120px] rounded-full border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-3 text-xs transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                                placeholder={t("legacy.reviewTable.default")}
                              />
                              <button
                                type="button"
                                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                                onClick={() => {
                                  updateMapping(row.field.path, (current) => ({
                                    ...current,
                                    constantValue: null,
                                  }));
                                  setShowConstantValue((prev) => {
                                    const next = new Set(prev);
                                    next.delete(row.field.path);
                                    return next;
                                  });
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="shrink-0 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                              onClick={() =>
                                setShowConstantValue((prev) => {
                                  const next = new Set(prev);
                                  next.add(row.field.path);
                                  return next;
                                })
                              }
                            >
                              + {t("legacy.reviewTable.default")}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.mapping.transform ?? "none"}
                          onValueChange={(value) => {
                            updateMapping(row.field.path, (current) => ({
                              ...current,
                              transform: value as TransformRule,
                            }));
                          }}
                        >
                            <SelectTrigger className="h-8 w-full min-w-[90px] max-w-[140px] rounded-full px-3 text-xs">
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
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={confidenceTone.variant}
                          className={clsx(
                            "rounded-full text-[11px] font-medium whitespace-nowrap",
                            confidenceTone.className,
                          )}
                        >
                          {`${Math.round(row.confidence * 100)}%`}
                          {row.confidence < 0.85 ? (
                            <span className="ml-1 opacity-70">
                              {row.confidence < 0.5 ? "Low" : "Review"}
                            </span>
                          ) : null}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--color-muted)]">
                        {issue || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {row.status !== "confirmed" ? (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="h-7 rounded-full px-3 text-[11px]"
                              onClick={() => acceptMapping(row.field.path)}
                            >
                              {t("legacy.reviewTable.accept")}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[var(--color-success)] font-medium">
                              {t("legacy.reviewTable.done")}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-full px-2.5 text-[11px]"
                            onClick={() => toggleDetails(row.field.path)}
                          >
                            {expandedDetails.has(row.field.path) ? t("legacy.reviewTable.hide") : t("legacy.reviewTable.reason")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>,
                    expandedDetails.has(row.field.path) ? (
                      <TableRow key={`${row.field.path}-detail`}>
                        <TableCell colSpan={7} className="bg-[var(--color-ink-03)] p-0">
                          <div className="px-4 py-3">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                              {t("legacy.reviewTable.manualNotes")}
                            </label>
                            <textarea
                              value={row.mapping.reason ?? ""}
                              onChange={(event) => {
                                updateMapping(row.field.path, (current) => ({
                                  ...current,
                                  reason: event.target.value,
                                }));
                              }}
                              className="mt-2 min-h-20 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-4 py-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
                              placeholder={t("legacy.reviewTable.addNotesPlaceholder")}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
