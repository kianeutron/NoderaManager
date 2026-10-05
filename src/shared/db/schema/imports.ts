import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns";

/**
 * A server-side, owner-bound plan for a historical outreach import.
 * The payload is intentionally kept here (rather than process memory) because MCP runs on
 * short-lived serverless instances. It is only readable by the actor/client that created it.
 */
export const bulkOutreachImports = pgTable("bulk_outreach_imports", {
  id: id(),
  actorId: text("actor_id").notNull(),
  source: text("source").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  status: text("status").notNull().default("previewed"),
  payload: jsonb("payload").notNull(),
  plan: jsonb("plan").notNull(),
  result: jsonb("result").notNull().default({}),
  commitIdempotencyKey: text("commit_idempotency_key"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  uniqueIndex("bulk_outreach_imports_actor_fingerprint_unique").on(table.actorId, table.source, table.requestFingerprint)
]);

export type BulkOutreachImport = typeof bulkOutreachImports.$inferSelect;
