import type { ApiErrorBody } from "@/shared/api/api-error-handler";
import { applicationReasons, type ApplicationReason } from "@/shared/errors/error-reasons";

/**
 * A non-2xx answer from the API. It carries the status and the server's code, reason and request id, never free text:
 * what the user reads comes from `describeError`. Its own `message` is for logs and tests only.
 */
export class ApiRequestError extends Error {
  public constructor(public readonly status: number, public readonly details: Partial<ApiErrorBody> = {}) {
    super(`Request failed with status ${status}`);
  }
}

/** Client errors (404, 400) will not fix themselves, so only transient failures are retried, twice at most. */
export function shouldRetryRequest(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiRequestError && error.status < 500;
  return !isClientError && failureCount < 2;
}

const isReason = (value: unknown): value is ApplicationReason => applicationReasons.some((reason) => reason === value);

/** The error for a non-2xx response. Used as `if (!response.ok) throw await toApiRequestError(response)` so the response type narrows. */
export async function toApiRequestError(response: Response): Promise<ApiRequestError> {
  const payload: unknown = await response.json().catch(() => null);
  const field = (name: string): unknown => (typeof payload === "object" && payload !== null && name in payload ? (payload as Record<string, unknown>)[name] : undefined);
  const { code, reason, requestId, invalidFields } = { code: field("code"), reason: field("reason"), requestId: field("requestId"), invalidFields: field("invalidFields") };

  return new ApiRequestError(response.status, {
    ...(typeof code === "string" ? { code } : {}),
    ...(isReason(reason) ? { reason } : {}),
    ...(typeof requestId === "string" ? { requestId } : {}),
    ...(Array.isArray(invalidFields) ? { invalidFields: invalidFields.filter((name): name is string => typeof name === "string") } : {})
  });
}
