import { sql, type AnyColumn } from "drizzle-orm";

/** The later of a stored timestamp and `at`, for "last contacted"-style columns that must never move backwards when an older event is recorded. */
export const latestTimestamp = (column: AnyColumn, at: Date) => sql`greatest(coalesce(${column}, ${at.toISOString()}::timestamptz), ${at.toISOString()}::timestamptz)`;
