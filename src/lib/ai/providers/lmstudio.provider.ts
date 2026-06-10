import { OpenAICompatibleProvider } from "@/lib/ai/providers/openai-compatible.provider";

export class LMStudioProvider extends OpenAICompatibleProvider {
  constructor(
    baseUrl = process.env.LM_STUDIO_BASE_URL ?? "http://localhost:1234/v1",
    model = process.env.LM_STUDIO_MODEL ?? "local-model",
  ) {
    super(baseUrl, model);
  }
}
