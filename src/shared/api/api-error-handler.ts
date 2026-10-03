import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { AccessBoundaryError } from "@/shared/auth/access-boundary";
import { RateLimitedError, type ApplicationErrorCode } from "@/shared/errors/application-error";
import { classifyError } from "@/shared/errors/classify-error";
import type { ApplicationReason } from "@/shared/errors/error-reasons";
import { logUnexpectedError } from "@/shared/observability/log-unexpected-error";

/** The body of every failed API response. It has no free text: the client words each code and reason itself. */
export type ApiErrorBody = Readonly<{ code: string; reason?: ApplicationReason; requestId?: string; /** For a validation failure: the top-level fields that were rejected. */ invalidFields?: readonly string[] }>;

const noStore = { "Cache-Control": "no-store" } as const;
const statusOfApplicationCode = { not_found: 404, limit_exceeded: 400, unsupported: 400, conflict: 409, unavailable: 503, rate_limited: 429 } as const satisfies Record<ApplicationErrorCode, ContentfulStatusCode>;

function respond(context: Context, status: ContentfulStatusCode, body: Omit<ApiErrorBody, "requestId">, headers: Readonly<Record<string, string>> = {}) {
  const requestId = context.get("requestId") as string | undefined;
  return context.json({ ...body, ...(requestId ? { requestId } : {}) } satisfies ApiErrorBody, status, { ...noStore, ...headers });
}

/** Field names only: enough to mark the inputs, and nothing the schema wrote in prose. */
function invalidFieldsOf(error: z.ZodError): string[] {
  return [...new Set(error.issues.flatMap((issue) => (typeof issue.path[0] === "string" ? [issue.path[0]] : [])))];
}

/** The single place an API failure becomes a response. Expected failures keep their meaning; anything else is logged and masked. */
export function handleApiError(error: Error, context: Context) {
  if (error instanceof AccessBoundaryError) return respond(context, error.status, { code: error.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" });
  if (error instanceof z.ZodError) return respond(context, 400, { code: "VALIDATION_ERROR", invalidFields: invalidFieldsOf(error) });

  const expected = classifyError(error);
  if (expected) {
    const headers = expected instanceof RateLimitedError ? { "Retry-After": String(expected.retryAfterSeconds) } : {};
    return respond(context, statusOfApplicationCode[expected.code], { code: expected.code.toUpperCase(), ...(expected.reason ? { reason: expected.reason } : {}) }, headers);
  }

  // Malformed JSON, an unreadable body, and similar: the request was wrong, not the server.
  if (error instanceof HTTPException && error.status >= 400 && error.status < 500) return respond(context, error.status as ContentfulStatusCode, { code: "BAD_REQUEST" });

  logUnexpectedError("api", error, { requestId: context.get("requestId") as string | undefined, method: context.req.method, path: new URL(context.req.url).pathname });
  return respond(context, 500, { code: "INTERNAL_ERROR" });
}

export function handleApiNotFound(context: Context) {
  return respond(context, 404, { code: "NOT_FOUND" });
}
