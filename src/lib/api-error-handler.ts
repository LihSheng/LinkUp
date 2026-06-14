import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/app-error";
import { classifyPrismaError } from "@/lib/prisma-error";
import type { ErrorCategory, ErrorScope } from "@/lib/prisma-error";
import { logBackendEvent } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<Response>;
type RouteHandlerMap = Record<string, RouteHandler>;

export interface ErrorEnvelope {
  error: string;
  code: string;
  category: ErrorCategory;
  status: number;
  retryable: boolean;
  scope: ErrorScope;
}

export function withErrorHandler<T extends RouteHandler>(handler: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AppError) {
        const code = crypto.randomUUID();

        logBackendEvent("error", "api", error.message, {
          code,
          category: error.category,
          scope: error.scope,
          error: error.message,
        });

        const envelope: ErrorEnvelope = {
          error: error.message,
          code,
          category: error.category,
          status: error.status,
          retryable: error.retryable,
          scope: error.scope,
        };

        return NextResponse.json(envelope, { status: error.status });
      }

      if (error instanceof ZodError) {
        const code = crypto.randomUUID();

        logBackendEvent("warn", "api", "Validation failed", { code });

        const envelope: ErrorEnvelope = {
          error: "Validation failed",
          code,
          category: "validation",
          status: 400,
          retryable: false,
          scope: "partial",
        };

        return NextResponse.json(envelope, { status: 400 });
      }

      const classified = classifyPrismaError(error);
      const code = crypto.randomUUID();

      logBackendEvent("error", "api", classified.message, {
        code,
        category: classified.category,
        scope: classified.scope,
        error: error instanceof Error ? error.message : String(error),
      });

      const envelope: ErrorEnvelope = {
        error: classified.message,
        code,
        category: classified.category,
        status: classified.status,
        retryable: classified.retryable,
        scope: classified.scope,
      };

      return NextResponse.json(envelope, { status: classified.status });
    }
  };

  return wrapped as T;
}

export function defineApiRouteHandlers<T extends RouteHandlerMap>(handlers: T): T {
  const wrapped = {} as T;

  for (const [key, handler] of Object.entries(handlers)) {
    wrapped[key as keyof T] = withErrorHandler(handler as T[keyof T]) as T[keyof T];
  }

  return wrapped;
}
