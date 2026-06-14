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
import type { SchemaMatchInput } from "@/lib/mapping/mapping.types";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { POST } = defineApiRouteHandlers({
  POST: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const run = await getRunWithRelations(id);

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    const provider = getConfiguredAIProvider();
    const model = getConfiguredAIModel();
    logBackendEvent("info", "suggest-route", "Suggest mapping started", {
      runId: id,
      provider,
      model,
      sourceSheetName: run.sourceSheetName,
      sourceColumnCount: Array.isArray(run.columnProfiles) ? run.columnProfiles.length : 0,
      sampleRowCount: Array.isArray(run.sampleRows) ? run.sampleRows.length : 0,
    });

    const aiService = new AIService(createAIProvider());
    const input: SchemaMatchInput = {
      targetJsonSchema: run.schemaTemplate.jsonSchema,
      sourceSheetName: run.sourceSheetName ?? "Sheet1",
      sourceColumns: (run.columnProfiles as SchemaMatchInput["sourceColumns"]) ?? [],
      sampleRows: (run.sampleRows as SchemaMatchInput["sampleRows"]) ?? [],
    };

    const { result: suggestion, diagnostics } =
      await aiService.suggestSchemaMappingDetailed(input);
    const suggestDiagnostics = {
      provider,
      model,
      durationMs: diagnostics.durationMs,
      mappingCount: suggestion.mappings.length,
      warningCount: suggestion.warnings.length,
      mappedFields: suggestion.mappings.filter((mapping) => mapping.sourceColumn).length,
      unmappedFields: suggestion.mappings.filter((mapping) => !mapping.sourceColumn).length,
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
      fields: suggestion.mappings.map((m) => ({
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
        suggestedMapping: suggestion as Prisma.InputJsonValue,
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
