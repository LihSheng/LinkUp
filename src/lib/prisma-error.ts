import { Prisma } from "@prisma/client";

export type ErrorCategory = "connection" | "not-found" | "conflict" | "validation" | "unknown";

export type ErrorScope = "system" | "partial";

export interface ClassifiedError {
  category: ErrorCategory;
  status: number;
  message: string;
  scope: ErrorScope;
  retryable: boolean;
}

export function classifyPrismaError(error: unknown): ClassifiedError {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { category: "connection", status: 503, message: "Database connection failed", scope: "system", retryable: true };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return { category: "not-found", status: 404, message: "Resource not found", scope: "partial", retryable: false };
    }
    if (error.code === "P2002") {
      return { category: "conflict", status: 409, message: "Resource already exists", scope: "partial", retryable: false };
    }
  }

  return { category: "unknown", status: 500, message: "Internal server error", scope: "partial", retryable: false };
}
