export type ProviderJsonResponse<T> = {
  data: T;
  rawText: string;
};

export type TestConnectionResult = {
  ok: boolean;
  provider: string;
  model: string;
  responseTimeMs: number;
  error?: string;
};

export interface LLMProvider {
  generateJson<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<ProviderJsonResponse<T>>;
  testConnection(): Promise<TestConnectionResult>;
}
