import { OpenAICompatibleProvider } from "@/lib/ai/providers/openai-compatible.provider";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export class NVIDIAProvider extends OpenAICompatibleProvider {
  constructor() {
    const apiKey = process.env.NVIDIA_API_KEY ?? "";
    const model = process.env.NVIDIA_MODEL ?? "meta/llama-3.1-8b-instruct";
    super(NVIDIA_BASE_URL, model, apiKey);
  }
}
