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

const MAX_AI_RETRIES = 2;
const BASE_TOKEN_BUDGET = 1200;
const TOKENS_PER_FIELD = 120;
const HEURISTIC_SKIP_THRESHOLD = 1.0;

export type SchemaSuggestionDiagnostics = {
  rawPreview: string | null;
  usedFallback: boolean;
  normalizedResponse: boolean;
  durationMs: number;
  mappingCount: number;
  warningCount: number;
  fallbackReason?: string;
  retryCount?: number;
  heuristicComplete?: boolean;
};

function computeMaxTokens(fieldCount: number): number {
  return Math.max(BASE_TOKEN_BUDGET, fieldCount * TOKENS_PER_FIELD + 300);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    const maxTokens = computeMaxTokens(expectedTargetPaths.length);

    const heuristicResult = buildHeuristicMapping(input);
    const heuristicHints = heuristicResult.mappings.filter((m) => m.sourceColumn !== null);

    const allFieldsMapped =
      heuristicHints.length === expectedTargetPaths.length &&
      heuristicHints.every((m) => m.confidence >= HEURISTIC_SKIP_THRESHOLD);

    if (allFieldsMapped) {
      const completed = ensureAllTargetPaths({
        result: heuristicResult,
        requiredPaths: expectedTargetPaths,
      });
      logBackendEvent("info", "ai-service", "All fields mapped heuristically, skipping LLM", {
        durationMs: Date.now() - startedAt,
        mappingCount: completed.mappings.length,
      });
      return {
        result: completed,
        diagnostics: {
          rawPreview: null,
          usedFallback: false,
          normalizedResponse: false,
          durationMs: Date.now() - startedAt,
          mappingCount: completed.mappings.length,
          warningCount: completed.warnings.length,
          heuristicComplete: true,
        },
      };
    }

    for (let attempt = 0; attempt <= MAX_AI_RETRIES; attempt++) {
      try {
        const providerResult = await this.provider.generateJson<SchemaMatchResult>({
          systemPrompt: buildSchemaMatchSystemPrompt(),
          userPrompt: buildSchemaMatchUserPrompt(compactInput, heuristicHints),
          temperature: 0.1,
          maxTokens,
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
          maxTokens,
          retryAttempt: attempt,
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
            retryCount: attempt,
          },
        };
      } catch (error) {
        if (attempt < MAX_AI_RETRIES) {
          const backoffMs = 1000 * Math.pow(2, attempt);
          logBackendEvent("warn", "ai-service", "Retrying AI schema mapping", {
            attempt: attempt + 1,
            backoffMs,
            error: error instanceof Error ? error.message : "unknown provider error",
          });
          await delay(backoffMs);
          continue;
        }

        const fallback = ensureAllTargetPaths({
          result: buildHeuristicMapping(input),
          requiredPaths: expectedTargetPaths,
        });
        logBackendEvent("warn", "ai-service", "Schema mapping suggestion fell back to heuristics", {
          durationMs: Date.now() - startedAt,
          mappingCount: fallback.mappings.length,
          warningCount: fallback.warnings.length,
          error: error instanceof Error ? error.message : "unknown provider error",
          retryAttempts: MAX_AI_RETRIES,
        });

        return {
          result: {
            ...fallback,
            warnings: [
              `AI provider fallback engaged after ${MAX_AI_RETRIES + 1} attempts: ${
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
            retryCount: MAX_AI_RETRIES,
          },
        };
      }
    }

    // TypeScript exhaustiveness — unreachable but satisfies the compiler
    throw new Error("Unexpected: exhausted all retry attempts without fallback");
  }

  async suggestSchemaMapping(input: SchemaMatchInput): Promise<SchemaMatchResult> {
    const detailed = await this.suggestSchemaMappingDetailed(input);
    return detailed.result;
  }
}
