import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { readJson, apiFetch, ClientError } from "@/lib/fetch-utils";
import { toast } from "sonner";

function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("readJson", () => {
  it("parses a successful JSON response", async () => {
    const data = await readJson<{ name: string }>(mockResponse({ name: "test" }));

    expect(data.name).toBe("test");
  });

  it("throws ClientError with envelope fields on non-ok response", async () => {
    const res = mockResponse({ error: "Not found", code: "abc", category: "not-found", status: 404, retryable: false, scope: "partial" }, 404);

    try {
      await readJson(res);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ClientError);
      const err = e as ClientError;
      expect(err.message).toBe("Not found");
      expect(err.code).toBe("abc");
      expect(err.category).toBe("not-found");
      expect(err.scope).toBe("partial");
      expect(err.retryable).toBe(false);
    }
  });

  it("throws ClientError with Request failed when no error message on non-ok", async () => {
    const res = mockResponse({}, 500);

    try {
      await readJson(res);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ClientError);
      expect((e as ClientError).message).toBe("Request failed.");
    }
  });
});

describe("apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed data on success", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ templates: [] }),
    );

    const data = await apiFetch<{ templates: unknown[] }>("/api/test");

    expect(data.templates).toEqual([]);
    fetchSpy.mockRestore();
  });

  it("shows partial toast with code when server returns error code", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ error: "DB down", code: "abc-123", scope: "partial" }, 503),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("DB down");
    expect(toast.error).toHaveBeenCalledWith("Something went wrong", {
      description: "Reference: abc-123",
    });

    fetchSpy.mockRestore();
  });

  it("shows system-unavailable toast when scope is system", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ error: "DB down", code: "sys-1", category: "connection", scope: "system" }, 503),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("DB down");
    expect(toast.error).toHaveBeenCalledWith("LinkUp is temporarily unavailable", {
      description: "Reference: sys-1. Please try again later.",
    });

    fetchSpy.mockRestore();
  });

  it("always shows toast on apiFetch error even without server code", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ error: "Bad request" }, 400),
    );

    await expect(apiFetch("/api/test")).rejects.toThrow("Bad request");
    expect(toast.error).toHaveBeenCalledOnce();

    fetchSpy.mockRestore();
  });

  it("throws ClientError with envelope on apiFetch error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ error: "Not found", code: "xyz", category: "not-found", status: 404, retryable: false, scope: "partial" }, 404),
    );

    try {
      await apiFetch("/api/test");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ClientError);
      const err = e as ClientError;
      expect(err.message).toBe("Not found");
      expect(err.code).toBe("xyz");
      expect(err.category).toBe("not-found");
      expect(err.scope).toBe("partial");
    }

    fetchSpy.mockRestore();
  });

  it("turns fetch rejection into a system-level ClientError", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    try {
      await apiFetch("/api/test");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ClientError);
      const err = e as ClientError;
      expect(err.scope).toBe("system");
      expect(err.status).toBe(503);
      expect(err.retryable).toBe(true);
    }

    expect(toast.error).toHaveBeenCalledWith("LinkUp is temporarily unavailable", {
      description: expect.stringContaining("Reference:"),
    });

    fetchSpy.mockRestore();
  });
});
