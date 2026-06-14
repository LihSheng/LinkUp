import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { AIService } from "@/lib/ai/ai.service";
import {
  createAIProvider,
  getConfiguredAIModel,
  getConfiguredAIProvider,
} from "@/lib/ai/provider-factory";
import { logBackendEvent } from "@/lib/logger";
import { getRunWithRelations } from "@/lib/mapping/mapping.service";
import type { SchemaMatchInput, MaskedRowPattern } from "@/lib/mapping/mapping.types";
import type { MaskingAuditSummary } from "@/lib/masking/masking.types";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";
import { capHeaderlessConfidence } from "@/lib/masking/masking.service";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { POST } = defineApiRouteHandlers({
  POST: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const run = await getRunWithRelations(id);

    if (!run) {
      return NextResponse.json({ error: serverT("api.runNotFound") }, { status: 404 });
    }

    const provider = getConfiguredAIProvider();
    const model = getConfiguredAIModel();
    const sourceMode = (run.sourceMode as "headered" | "headerless") ?? "headered";
    logBackendEvent("info", "suggest-route", "Suggest mapping started", {
      runId: id,
      provider,
      model,
      sourceMode,
      sourceSheetName: run.sourceSheetName,
      sourceColumnCount: Array.isArray(run.columnProfiles) ? run.columnProfiles.length : 0,
    });

    const aiService = new AIService(createAIProvider());

    const profiles = (run.columnProfiles as SchemaMatchInput["sourceColumns"]) ?? [];
    const maskedRowPatterns = run.maskedRowPatterns as MaskedRowPattern[] | null ?? [];

    const input: SchemaMatchInput = {
      targetJsonSchema: run.schemaTemplate.jsonSchema,
      sourceSheetName: run.sourceSheetName ?? "Sheet1",
      sourceColumns: profiles,
      sampleRows: [],
      maskedRowPatterns: maskedRowPatterns.length > 0 ? maskedRowPatterns : undefined,
      sourceMode,
    };

    const { result: suggestion, diagnostics } =
      await aiService.suggestSchemaMappingDetailed(input);

    let finalMappings = suggestion.mappings;

    if (sourceMode === "headerless" || maskedRowPatterns.length > 0) {
      const sourceColumnNames = profiles.map((p) => p.name);
      const audit = run.maskingAudit as MaskingAuditSummary | null;
      const rawCategories = audit?.valueCategories ?? {};
      const valueCategories = new Map<string, import("@/lib/masking/masking.types").MaskedValueCategory>(
        Object.entries(rawCategories).map(([k, v]) => [k, v as import("@/lib/masking/masking.types").MaskedValueCategory]),
      );
      finalMappings = capHeaderlessConfidence(finalMappings, valueCategories, sourceColumnNames);
    }

    const suggestDiagnostics = {
      provider,
      model,
      sourceMode,
      durationMs: diagnostics.durationMs,
      mappingCount: finalMappings.length,
      warningCount: suggestion.warnings.length,
      mappedFields: finalMappings.filter((mapping) => mapping.sourceColumn).length,
      unmappedFields: finalMappings.filter((mapping) => !mapping.sourceColumn).length,
      usedFallback: diagnostics.usedFallback,
      normalizedResponse: diagnostics.normalizedResponse,
      rawPreview: diagnostics.rawPreview,
      fallbackReason: diagnostics.fallbackReason ?? null,
    };
    logBackendEvent("info", "suggest-route", "Suggest mapping result received", {
      runId: id,
      ...suggestDiagnostics,
    });

    logBackendEvent("info", "suggest-route", "Mapping field details", {
      runId: id,
      algorithm: diagnostics.usedFallback ? "heuristic" : "ai",
      retryCount: diagnostics.retryCount ?? 0,
      fields: finalMappings.map((m) => ({
        targetPath: m.targetPath,
        sourceColumn: m.sourceColumn ?? "(none)",
        confidence: m.confidence,
        transform: m.transform ?? "none",
        reason: m.reason ?? "",
      })),
    });

    const updated = await prisma.mappingRun.update({
      where: { id },
      data: {
        suggestedMapping: {
          mappings: finalMappings,
          warnings: suggestion.warnings,
        } as Prisma.InputJsonValue,
        status: "suggested",
      },
    });

    return NextResponse.json({
      run: {
        ...updated,
        aiProvider: provider,
        suggestDiagnostics,
        schemaTemplate: run.schemaTemplate,
        targetFields: flattenJsonSchema(run.schemaTemplate.jsonSchema),
        workbookMeta: run.uploadedFile?.workbookMeta ?? null,
      },
    });
  },
});
