import { ApplicationError } from "@/shared/errors/application-error";

// PostgreSQL SQLSTATE classes for constraint failures (https://www.postgresql.org/docs/current/errcodes-appendix.html).
const uniqueViolation = "23505";
const foreignKeyViolation = "23503";
const checkViolation = "23514";

function databaseErrorCode(error: unknown): string | undefined {
  // Drizzle wraps the driver error, so the SQLSTATE is on the error or on its cause.
  for (let current: unknown = error, depth = 0; current instanceof Error && depth < 3; current = current.cause, depth += 1) {
    const { code } = current as { code?: unknown };
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

/**
 * Turns the failures a caller can correct into `ApplicationError`s: those the services threw, and constraint violations the
 * database caught when two requests raced past the services' own checks. Everything else is unexpected and stays masked.
 */
export function classifyError(error: unknown): ApplicationError | null {
  if (error instanceof ApplicationError) return error;

  switch (databaseErrorCode(error)) {
    case uniqueViolation: return new ApplicationError("conflict", "That record already exists.", "already_exists");
    case foreignKeyViolation: return new ApplicationError("conflict", "A record this one refers to no longer exists.", "invalid_reference");
    case checkViolation: return new ApplicationError("conflict", "The change breaks a data rule.", "rule_violated");
    default: return null;
  }
}

/** What is safe to log about an unexpected error: its type and database code, never its message (it can hold SQL and values). */
export function describeForLog(error: unknown): { errorName: string; databaseCode?: string } {
  const databaseCode = databaseErrorCode(error);
  return { errorName: error instanceof Error ? error.name : "unknown", ...(databaseCode ? { databaseCode } : {}) };
}
