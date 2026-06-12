import { NextResponse } from "next/server";
import { createAIProvider, getConfiguredAIModel, getConfiguredAIProvider } from "@/lib/ai/provider-factory";
import { logBackendEvent } from "@/lib/logger";

export async function POST() {
  const provider = getConfiguredAIProvider();
  const model = getConfiguredAIModel();

  logBackendEvent("info", "test-connection", "Testing LLM connection", {
    provider,
    model,
  });

  const aiProvider = createAIProvider();
  const result = await aiProvider.testConnection();

  logBackendEvent(
    result.ok ? "info" : "warn",
    "test-connection",
    `LLM connection test ${result.ok ? "succeeded" : "failed"}`,
    {
      provider: result.provider,
      model: result.model,
      responseTimeMs: result.responseTimeMs,
      error: result.error ?? null,
    },
  );

  return NextResponse.json({
    connected: result.ok,
    provider: result.provider,
    model: result.model,
    responseTimeMs: result.responseTimeMs,
    ...(result.error ? { error: result.error } : {}),
  });
}
