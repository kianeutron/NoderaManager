import { sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One counter per rate-limit key and fixed time window (docs/03-api/04-rate-limits.md). Kept in the database rather than in
 * process memory because serverless instances do not share memory. There is no surrogate id: the key and window identify a row.
 */
export const rateLimitWindows = pgTable("rate_limit_windows", {
  key: text("key").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull()
}, (table) => [
  primaryKey({ columns: [table.key, table.windowStart] }),
  check("rate_limit_windows_request_count_positive", sql`${table.requestCount} > 0`)
]);
