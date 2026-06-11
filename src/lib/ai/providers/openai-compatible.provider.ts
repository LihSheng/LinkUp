import type { LLMProvider, ProviderJsonResponse } from "@/lib/ai/ai.types";
import { logBackendEvent } from "@/lib/logger";

export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    protected readonly baseUrl: string,
    protected readonly model: string,
    protected readonly apiKey?: string,
  ) {}

  async generateJson<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<ProviderJsonResponse<T>> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 60000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    logBackendEvent("info", "llm", "Calling OpenAI-compatible provider", {
      provider: this.constructor.name,
      baseUrl: this.baseUrl,
      model: this.model,
      maxTokens: params.maxTokens ?? 2000,
      temperature: params.temperature ?? 0.1,
      timeoutMs,
    });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          temperature: params.temperature ?? 0.1,
          max_tokens: params.maxTokens ?? 2000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: params.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        logBackendEvent("error", "llm", "OpenAI-compatible provider request failed", {
          provider: this.constructor.name,
          baseUrl: this.baseUrl,
          model: this.model,
          status: response.status,
          durationMs: Date.now() - startedAt,
        });
        throw new Error(`LLM request failed with status ${response.status}.`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        logBackendEvent("error", "llm", "OpenAI-compatible provider returned empty content", {
          provider: this.constructor.name,
          baseUrl: this.baseUrl,
          model: this.model,
          durationMs: Date.now() - startedAt,
        });
        throw new Error("LLM provider returned empty content.");
      }

      logBackendEvent("info", "llm", "OpenAI-compatible provider returned content", {
        provider: this.constructor.name,
        baseUrl: this.baseUrl,
        model: this.model,
        durationMs: Date.now() - startedAt,
        contentLength: content.length,
      });

      return {
        data: JSON.parse(content) as T,
        rawText: content,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`LLM request timed out after ${timeoutMs}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
