import { buildMaskedColumnProfiles, type MaskedColumnResult } from "@/lib/masking/column-masker";
import { buildMaskedRowPatterns } from "@/lib/masking/row-pattern-masker";
import { buildSyntheticColumnNames } from "@/lib/masking/headerless-naming";
import { getHeaderlessConfidenceCap } from "@/lib/masking/masking.types";
import { getConfiguredAIProvider } from "@/lib/ai/provider-factory";
import type { ColumnProfile, FieldMapping, MaskedRowPattern } from "@/lib/mapping/mapping.types";
import type {
  MaskedValueCategory,
  SourceMode,
  MaskingAuditSummary,
} from "@/lib/masking/masking.types";

export type MaskedWorkbookResult = {
  maskedProfiles: ColumnProfile[];
  valueCategories: Map<string, MaskedValueCategory>;
  maskedRowPatterns: MaskedRowPattern[];
  auditSummary: MaskingAuditSummary;
};

export function maskWorkbookProfiles(params: {
  profiles: ColumnProfile[];
  sampleRows: Record<string, unknown>[];
  sourceMode: SourceMode;
  includeRowPatterns: boolean;
  provider?: string;
}): MaskedWorkbookResult {
  const provider = params.provider ?? getConfiguredAIProvider();

  const columnResults = buildMaskedColumnProfiles(params.profiles, {
    sourceMode: params.sourceMode,
  });

  const maskedProfiles = columnResults.map((r) => r.profile);
  const valueCategories = new Map<string, MaskedValueCategory>();
  for (const r of columnResults) {
    valueCategories.set(r.profile.name, r.valueCategory);
  }

  const columnNames = maskedProfiles.map((p) => p.name);
  let maskedRowPatterns: MaskedRowPattern[] = [];

  if (params.includeRowPatterns && params.sampleRows.length > 0) {
    maskedRowPatterns = buildMaskedRowPatterns(params.sampleRows, columnNames);
  }

  const auditSummary: MaskingAuditSummary = {
    sourceMode: params.sourceMode,
    maskedColumnProfilesSent: true,
    maskedRowPatternsSent: maskedRowPatterns.length > 0,
    maskedRowPatternCount: maskedRowPatterns.length,
    valueCategories: Object.fromEntries(valueCategories),
    provider,
    timestamp: new Date().toISOString(),
  };

  return {
    maskedProfiles,
    valueCategories,
    maskedRowPatterns,
    auditSummary,
  };
}

export function capHeaderlessConfidence(
  mappings: FieldMapping[],
  valueCategories: Map<string, MaskedValueCategory>,
  sourceColumnNames: string[],
): FieldMapping[] {
  const columnToCategory = new Map<string, MaskedValueCategory>();
  for (const [name, cat] of valueCategories) {
    columnToCategory.set(name, cat);
  }

  return mappings.map((mapping) => {
    if (!mapping.sourceColumn) return mapping;

    const colName = mapping.sourceColumn;
    const syntheticNames = buildSyntheticColumnNames(sourceColumnNames.length);
    const isHeaderlessColumn = syntheticNames.includes(colName);

    if (!isHeaderlessColumn) return mapping;

    const category = columnToCategory.get(colName) ?? "unknown";
    const cap = getHeaderlessConfidenceCap(category);

    return {
      ...mapping,
      confidence: Math.min(mapping.confidence, cap),
    };
  });
}
