export type ProviderJsonResponse<T> = {
  data: T;
  rawText: string;
};

export interface LLMProvider {
  generateJson<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<ProviderJsonResponse<T>>;
}
