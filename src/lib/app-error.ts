import type { ErrorCategory, ErrorScope } from "@/lib/prisma-error";

export interface AppErrorOptions {
  category: ErrorCategory;
  status: number;
  scope: ErrorScope;
  retryable: boolean;
}

export class AppError extends Error {
  category: ErrorCategory;
  status: number;
  scope: ErrorScope;
  retryable: boolean;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.category = options.category;
    this.status = options.status;
    this.scope = options.scope;
    this.retryable = options.retryable;
  }
}
