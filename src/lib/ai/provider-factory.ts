import type { LLMProvider } from "@/lib/ai/ai.types";
import { LMStudioProvider } from "@/lib/ai/providers/lmstudio.provider";
import { OllamaProvider } from "@/lib/ai/providers/ollama.provider";

export type SupportedAIProvider = "lmstudio" | "ollama";

export function getConfiguredAIProvider(): SupportedAIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === "ollama") {
    return "ollama";
  }

  return "lmstudio";
}

export function createAIProvider(): LLMProvider {
  const provider = getConfiguredAIProvider();

  switch (provider) {
    case "ollama":
      return new OllamaProvider();
    case "lmstudio":
    default:
      return new LMStudioProvider();
  }
}

export function getConfiguredAIModel() {
  const provider = getConfiguredAIProvider();

  return provider === "ollama"
    ? process.env.OLLAMA_MODEL ?? "llama3.1"
    : process.env.LM_STUDIO_MODEL ?? "local-model";
}
