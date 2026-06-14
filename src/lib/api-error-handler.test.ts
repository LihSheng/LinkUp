import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { defineApiRouteHandlers, withErrorHandler } from "@/lib/api-error-handler";

describe("withErrorHandler", () => {
  it("returns the handler response when no error is thrown", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
    const wrapped = withErrorHandler(handler);

    const req = new NextRequest(new Request("http://localhost:3000/api/test"));
    const response = await wrapped(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
  });

  it("returns 503 with error code on Prisma connection error", async () => {
    const dbError = new Prisma.PrismaClientInitializationError("Can't reach database", "P1001");
    const handler = vi.fn().mockRejectedValue(dbError);
    const wrapped = withErrorHandler(handler);

    const req = new NextRequest(new Request("http://localhost:3000/api/test"));
    const response = await wrapped(req);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("Database connection failed");
    expect(body.code).toBeDefined();
    expect(typeof body.code).toBe("string");
    expect(body.category).toBe("connection");
    expect(body.scope).toBe("system");
    expect(body.retryable).toBe(true);
  });

  it("returns 500 with error code on generic Error", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Unexpected failure"));
    const wrapped = withErrorHandler(handler);

    const req = new NextRequest(new Request("http://localhost:3000/api/test"));
    const response = await wrapped(req);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(body.code).toBeDefined();
    expect(body.category).toBe("unknown");
    expect(body.scope).toBe("partial");
    expect(body.retryable).toBe(false);
  });

  it("returns 400 with error code on ZodError", async () => {
    let zodError: z.ZodError;
    try { z.object({ name: z.string() }).parse({}); } catch (e) { zodError = e as z.ZodError; }
    const handler = vi.fn().mockRejectedValue(zodError!);
    const wrapped = withErrorHandler(handler);

    const req = new NextRequest(new Request("http://localhost:3000/api/test"));
    const response = await wrapped(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBeDefined();
    expect(body.category).toBe("validation");
    expect(body.scope).toBe("partial");
    expect(body.retryable).toBe(false);
  });

  it("generates a unique error code per invocation", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("fail"));
    const wrapped = withErrorHandler(handler);

    const req = new NextRequest(new Request("http://localhost:3000/api/test"));
    const res1 = await wrapped(req.clone());
    const res2 = await wrapped(req.clone());

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(body1.code).not.toBe(body2.code);
  });

  it("wraps every route handler in a shared factory", async () => {
    const routes = defineApiRouteHandlers({
      GET: vi.fn().mockResolvedValue(NextResponse.json({ ok: true })),
      POST: vi.fn().mockResolvedValue(NextResponse.json({ ok: true })),
    });

    const req = new NextRequest(new Request("http://localhost:3000/api/test"));
    const res = await routes.GET(req);

    expect(res.status).toBe(200);
    expect(routes.POST).toBeDefined();
  });
});
