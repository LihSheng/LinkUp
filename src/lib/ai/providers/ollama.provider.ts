import type { LLMProvider, ProviderJsonResponse } from "@/lib/ai/ai.types";
import { logBackendEvent } from "@/lib/logger";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

export class OllamaProvider implements LLMProvider {
  constructor(
    private readonly baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    private readonly model = process.env.OLLAMA_MODEL ?? "llama3.1",
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
    logBackendEvent("info", "llm", "Calling Ollama provider", {
      provider: "ollama",
      baseUrl: this.baseUrl,
      model: this.model,
      maxTokens: params.maxTokens ?? 2000,
      temperature: params.temperature ?? 0.1,
      timeoutMs,
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: "json",
          options: {
            temperature: params.temperature ?? 0.1,
            num_predict: params.maxTokens ?? 2000,
          },
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: params.userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        logBackendEvent("error", "llm", "Ollama request failed", {
          provider: "ollama",
          baseUrl: this.baseUrl,
          model: this.model,
          status: response.status,
          durationMs: Date.now() - startedAt,
        });
        throw new Error(`Ollama request failed with status ${response.status}.`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      const content = data.message?.content;

      if (!content) {
        logBackendEvent("error", "llm", "Ollama returned empty content", {
          provider: "ollama",
          baseUrl: this.baseUrl,
          model: this.model,
          durationMs: Date.now() - startedAt,
        });
        throw new Error("Ollama returned empty content.");
      }

      logBackendEvent("info", "llm", "Ollama returned content", {
        provider: "ollama",
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
        throw new Error(`Ollama request timed out after ${timeoutMs}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
