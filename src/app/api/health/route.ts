import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { logBackendEvent } from "@/lib/logger";

export async function GET() {
  const checks: Record<string, unknown> = {};
  let allHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy" };
  } catch (error) {
    allHealthy = false;
    const message = error instanceof Error ? error.message : String(error);
    checks.database = { status: "unhealthy", error: message };
    logBackendEvent("error", "health", "Database health check failed", { error: message });
  }

  const statusCode = allHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      checks,
    },
    { status: statusCode },
  );
}
