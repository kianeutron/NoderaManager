import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "./columns";
import { externalRefTypeEnum, externalSourceEnum } from "./crm-enums";
import { interactions, outreachMessages } from "./engagement";
import { organizations, people, prospects } from "./core";

/**
 * Identifiers issued by other systems (Gmail message and thread ids, LinkedIn conversation URLs, import record ids).
 * A message id resolves to exactly one record; a thread id may tag every message in the thread. Never use a subject as identity.
 * Connector credentials are never stored here.
 */
export const externalRefs = pgTable("external_refs", {
  id: id(),
  source: externalSourceEnum("source").notNull(),
  refType: externalRefTypeEnum("ref_type").notNull(),
  externalId: text("external_id").notNull(),
  personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  prospectId: uuid("prospect_id").references(() => prospects.id, { onDelete: "restrict" }),
  outreachMessageId: uuid("outreach_message_id").references(() => outreachMessages.id, { onDelete: "restrict" }),
  interactionId: uuid("interaction_id").references(() => interactions.id, { onDelete: "restrict" }),
  createdAt: createdAt()
}, (table) => [
  check("external_refs_single_target", sql`num_nonnulls(${table.personId}, ${table.organizationId}, ${table.prospectId}, ${table.outreachMessageId}, ${table.interactionId}) = 1`),
  check("external_refs_external_id_length", sql`char_length(${table.externalId}) between 1 and 500`),
  // The idempotency guarantee for logging sent mail: one provider message id, one record.
  uniqueIndex("external_refs_message_id_unique").on(table.source, table.externalId).where(sql`${table.refType} = 'message_id'`),
  uniqueIndex("external_refs_person_unique").on(table.source, table.refType, table.externalId, table.personId).where(sql`${table.personId} is not null`),
  uniqueIndex("external_refs_organization_unique").on(table.source, table.refType, table.externalId, table.organizationId).where(sql`${table.organizationId} is not null`),
  uniqueIndex("external_refs_prospect_unique").on(table.source, table.refType, table.externalId, table.prospectId).where(sql`${table.prospectId} is not null`),
  uniqueIndex("external_refs_outreach_message_unique").on(table.source, table.refType, table.externalId, table.outreachMessageId).where(sql`${table.outreachMessageId} is not null`),
  uniqueIndex("external_refs_interaction_unique").on(table.source, table.refType, table.externalId, table.interactionId).where(sql`${table.interactionId} is not null`),
  index("external_refs_lookup_index").on(table.source, table.refType, table.externalId)
]);

/** Replay protection for retried MCP calls and imports. The service, not the adapter, enforces it. */
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: id(),
  operation: text("operation").notNull(),
  source: text("source").notNull(),
  key: text("key").notNull(),
  /** Hash of the normalized request, so the same key with a different payload is detected as misuse. */
  requestFingerprint: text("request_fingerprint").notNull(),
  resultEntityType: text("result_entity_type"),
  resultEntityId: uuid("result_entity_id"),
  createdAt: createdAt(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
}, (table) => [
  check("idempotency_keys_key_length", sql`char_length(${table.key}) between 1 and 200`),
  uniqueIndex("idempotency_keys_operation_source_key_unique").on(table.operation, table.source, table.key),
  index("idempotency_keys_expires_at_index").on(table.expiresAt)
]);
