import type { LLMProvider } from "@/lib/ai/ai.types";
import { LMStudioProvider } from "@/lib/ai/providers/lmstudio.provider";
import { NVIDIAProvider } from "@/lib/ai/providers/nvidia.provider";
import { OllamaProvider } from "@/lib/ai/providers/ollama.provider";

export type SupportedAIProvider = "lmstudio" | "ollama" | "nvidia";

export function getConfiguredAIProvider(): SupportedAIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === "ollama") {
    return "ollama";
  }

  if (provider === "nvidia") {
    return "nvidia";
  }

  return "lmstudio";
}

export function createAIProvider(): LLMProvider {
  const provider = getConfiguredAIProvider();

  switch (provider) {
    case "ollama":
      return new OllamaProvider();
    case "nvidia":
      return new NVIDIAProvider();
    case "lmstudio":
    default:
      return new LMStudioProvider();
  }
}

export function getConfiguredAIModel() {
  const provider = getConfiguredAIProvider();

  switch (provider) {
    case "ollama":
      return process.env.OLLAMA_MODEL ?? "llama3.1";
    case "nvidia":
      return process.env.NVIDIA_MODEL ?? "meta/llama-3.1-8b-instruct";
    case "lmstudio":
    default:
      return process.env.LM_STUDIO_MODEL ?? "local-model";
  }
}
