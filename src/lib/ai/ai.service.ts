import type { LLMProvider } from "@/lib/ai/ai.types";
import {
  buildSchemaMatchSystemPrompt,
  buildSchemaMatchUserPrompt,
} from "@/lib/ai/prompts/schema-match.prompt";
import {
  buildCompactSchemaMatchInput,
  ensureAllTargetPaths,
  normalizeSchemaMatchResult,
} from "@/lib/ai/schema-match-response";
import { logBackendEvent } from "@/lib/logger";
import { buildHeuristicMapping } from "@/lib/mapping/heuristic-mapper";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import type { SchemaMatchInput, SchemaMatchResult } from "@/lib/mapping/mapping.types";

export type SchemaSuggestionDiagnostics = {
  rawPreview: string | null;
  usedFallback: boolean;
  normalizedResponse: boolean;
  durationMs: number;
  mappingCount: number;
  warningCount: number;
  fallbackReason?: string;
};

export class AIService {
  constructor(private readonly provider: LLMProvider) {}

  async suggestSchemaMappingDetailed(input: SchemaMatchInput): Promise<{
    result: SchemaMatchResult;
    diagnostics: SchemaSuggestionDiagnostics;
  }> {
    const startedAt = Date.now();
    const compactInput = buildCompactSchemaMatchInput(input);
    const expectedTargetPaths = flattenJsonSchema(input.targetJsonSchema).map(
      (field) => field.path,
    );

    try {
      const providerResult = await this.provider.generateJson<SchemaMatchResult>({
        systemPrompt: buildSchemaMatchSystemPrompt(),
        userPrompt: buildSchemaMatchUserPrompt(compactInput),
        temperature: 0.1,
        maxTokens: Number(process.env.AI_SUGGEST_MAX_TOKENS ?? 700),
      });
      const normalized = normalizeSchemaMatchResult({
        parsed: providerResult.data,
        input: compactInput,
      });
      const completed = ensureAllTargetPaths({
        result: normalized.result,
        requiredPaths: expectedTargetPaths,
      });
      const normalizedResponse =
        normalized.result.warnings.length !==
          ((providerResult.data as { warnings?: unknown[] } | undefined)?.warnings?.length ?? 0) ||
        completed.mappings.length !==
          ((providerResult.data as { mappings?: unknown[] } | undefined)?.mappings?.length ?? 0);

      logBackendEvent("info", "ai-service", "Schema mapping suggestion completed", {
        durationMs: Date.now() - startedAt,
        mappingCount: completed.mappings.length,
        warningCount: completed.warnings.length,
        normalizedResponse,
      });

      return {
        result: completed,
        diagnostics: {
          rawPreview: providerResult.rawText.slice(0, 600),
          usedFallback: false,
          normalizedResponse,
          durationMs: Date.now() - startedAt,
          mappingCount: completed.mappings.length,
          warningCount: completed.warnings.length,
        },
      };
    } catch (error) {
      const fallback = ensureAllTargetPaths({
        result: buildHeuristicMapping(input),
        requiredPaths: expectedTargetPaths,
      });
      logBackendEvent("warn", "ai-service", "Schema mapping suggestion fell back to heuristics", {
        durationMs: Date.now() - startedAt,
        mappingCount: fallback.mappings.length,
        warningCount: fallback.warnings.length,
        error: error instanceof Error ? error.message : "unknown provider error",
      });

      return {
        result: {
          ...fallback,
          warnings: [
            `AI provider fallback engaged: ${
              error instanceof Error ? error.message : "unknown provider error"
            }`,
            ...fallback.warnings,
          ],
        },
        diagnostics: {
          rawPreview: null,
          usedFallback: true,
          normalizedResponse: false,
          durationMs: Date.now() - startedAt,
          mappingCount: fallback.mappings.length,
          warningCount: fallback.warnings.length + 1,
          fallbackReason:
            error instanceof Error ? error.message : "unknown provider error",
        },
      };
    }
  }

  async suggestSchemaMapping(input: SchemaMatchInput): Promise<SchemaMatchResult> {
    const detailed = await this.suggestSchemaMappingDetailed(input);
    return detailed.result;
  }
}
