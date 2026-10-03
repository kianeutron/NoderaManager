import type { ApplicationReason } from "@/shared/errors/error-reasons";

export type ApplicationErrorCode = "not_found" | "conflict" | "unsupported" | "limit_exceeded" | "unavailable" | "rate_limited";

/**
 * An expected, caller-correctable failure (docs/01-architecture/06-error-model.md). `message` is written for the MCP
 * caller (an assistant that can act on detail such as ids) and is never sent to the browser: the web API sends `code`
 * and the optional `reason`, and the client words them. It must still never contain SQL or private data.
 */
export class ApplicationError extends Error {
  public constructor(public readonly code: ApplicationErrorCode, message: string, public readonly reason?: ApplicationReason) {
    super(message);
  }
}

/** Too many requests in a window. `retryAfterSeconds` becomes the `Retry-After` header. */
export class RateLimitedError extends ApplicationError {
  public constructor(public readonly retryAfterSeconds: number) {
    super("rate_limited", `Too many requests. Try again in ${retryAfterSeconds} seconds.`);
  }
}
