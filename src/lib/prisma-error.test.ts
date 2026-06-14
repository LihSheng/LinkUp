import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

import { classifyPrismaError } from "@/lib/prisma-error";

describe("classifyPrismaError", () => {
  it("classifies PrismaClientInitializationError as connection error with 503", () => {
    const error = new Prisma.PrismaClientInitializationError("Can't reach database", "P1001");

    const result = classifyPrismaError(error);

    expect(result.category).toBe("connection");
    expect(result.status).toBe(503);
    expect(result.message).toBe("Database connection failed");
    expect(result.scope).toBe("system");
    expect(result.retryable).toBe(true);
  });

  it("classifies P2025 (record not found) as not-found with 404", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Record does not exist", { code: "P2025", clientVersion: "6" });

    const result = classifyPrismaError(error);

    expect(result.category).toBe("not-found");
    expect(result.status).toBe(404);
    expect(result.message).toBe("Resource not found");
    expect(result.scope).toBe("partial");
    expect(result.retryable).toBe(false);
  });

  it("classifies P2002 (unique constraint) as conflict with 409", () => {
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6" });

    const result = classifyPrismaError(error);

    expect(result.category).toBe("conflict");
    expect(result.status).toBe(409);
    expect(result.message).toBe("Resource already exists");
    expect(result.scope).toBe("partial");
    expect(result.retryable).toBe(false);
  });

  it("classifies a generic Error as unknown with 500", () => {
    const error = new Error("Something went wrong");

    const result = classifyPrismaError(error);

    expect(result.category).toBe("unknown");
    expect(result.status).toBe(500);
    expect(result.message).toBe("Internal server error");
    expect(result.scope).toBe("partial");
    expect(result.retryable).toBe(false);
  });
});
