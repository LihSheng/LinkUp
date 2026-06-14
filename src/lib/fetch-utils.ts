import { toast } from "sonner";
import type { ErrorCategory, ErrorScope } from "@/lib/prisma-error";

export interface ErrorEnvelope {
  error: string;
  code: string;
  category: ErrorCategory;
  status: number;
  retryable: boolean;
  scope: ErrorScope;
}

export class ClientError extends Error {
  code: string;
  category: ErrorCategory;
  status: number;
  retryable: boolean;
  scope: ErrorScope;

  constructor(envelope: ErrorEnvelope) {
    super(envelope.error);
    this.name = "ClientError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = envelope.code;
    this.category = envelope.category;
    this.status = envelope.status;
    this.retryable = envelope.retryable;
    this.scope = envelope.scope;
  }
}

type ParsedBody<T> = T &
  Partial<{ error: string; code: string; category: ErrorCategory; status: number; retryable: boolean; scope: ErrorScope }>;

async function parseBody<T>(response: Response): Promise<ParsedBody<T>> {
  const text = await response.text();

  if (!text) {
    return {} as ParsedBody<T>;
  }

  try {
    return JSON.parse(text) as ParsedBody<T>;
  } catch {
    if (!response.ok) {
      throw new ClientError({
        error: text,
        code: crypto.randomUUID(),
        category: "unknown",
        status: response.status,
        retryable: false,
        scope: "partial",
      });
    }

    throw new ClientError({
      error: "Received an invalid JSON response from the server.",
      code: crypto.randomUUID(),
      category: "unknown",
      status: 500,
      retryable: false,
      scope: "partial",
    });
  }
}

export async function readJson<T>(response: Response): Promise<T> {
  const data = await parseBody<T>(response);

  if (!response.ok) {
    throw new ClientError({
      error: data.error ?? "Request failed.",
      code: data.code ?? crypto.randomUUID(),
      category: data.category ?? "unknown",
      status: response.status,
      retryable: data.retryable ?? false,
      scope: data.scope ?? "partial",
    });
  }

  return data;
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    const envelope: ErrorEnvelope = {
      error: error instanceof Error ? error.message : "Failed to reach the server.",
      code: crypto.randomUUID(),
      category: "connection",
      status: 503,
      retryable: true,
      scope: "system",
    };

    toast.error("LinkUp is temporarily unavailable", {
      description: `Reference: ${envelope.code}. Please try again later.`,
    });

    throw new ClientError(envelope);
  }

  const data = await parseBody<T>(response);

  if (!response.ok) {
    const envelope: ErrorEnvelope = {
      error: data.error ?? "Request failed.",
      code: data.code ?? crypto.randomUUID(),
      category: data.category ?? "unknown",
      status: response.status,
      retryable: data.retryable ?? false,
      scope: data.scope ?? "partial",
    };

    if (envelope.scope === "system") {
      toast.error("LinkUp is temporarily unavailable", {
        description: `Reference: ${envelope.code}. Please try again later.`,
      });
    } else {
      toast.error("Something went wrong", {
        description: `Reference: ${envelope.code}`,
      });
    }

    throw new ClientError(envelope);
  }

  return data;
}
