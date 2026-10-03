import { describeForLog } from "@/shared/errors/classify-error";

/**
 * One structured line per unexpected failure (docs/07-quality/07-observability.md). The request id is what the user is
 * shown, so support can find this line; the error message is deliberately not logged (it can carry SQL and values).
 */
export function logUnexpectedError(scope: string, error: unknown, context: Readonly<Record<string, string | undefined>> = {}): void {
  console.error("unexpected_error", { scope, ...context, ...describeForLog(error) });
}
