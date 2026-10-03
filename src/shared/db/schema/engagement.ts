import { sql } from "drizzle-orm";
import { check, foreignKey, index, jsonb, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tsvector, updatedAt } from "./columns";
import { bounceStatusEnum, ctaTypeEnum, deliveryStatusEnum, followUpStatusEnum, interactionDirectionEnum, interactionTypeEnum, outreachChannelEnum, proofPointTypeEnum, replyStatusEnum, sentimentEnum } from "./crm-enums";
import { maxResponseDepth } from "./crm-values";
import { organizations, people, prospects, routeModules, routes } from "./core";
import { campaigns, signals } from "./strategy";

/**
 * The exact message that was sent. Target, route/module and campaign are copied at send time so history stays
 * correct if the prospect is later re-attributed. Corrections are updates plus audit events, never silent rewrites.
 * Gmail/LinkedIn identifiers live in `external_refs`.
 */
export const outreachMessages = pgTable("outreach_messages", {
  id: id(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "restrict" }),
  routeId: uuid("route_id").references(() => routes.id, { onDelete: "restrict" }),
  routeModuleId: uuid("route_module_id"),
  signalId: uuid("signal_id").references(() => signals.id, { onDelete: "restrict" }),
  channel: outreachChannelEnum("channel").notNull(),
  ctaType: ctaTypeEnum("cta_type"),
  proofPointType: proofPointTypeEnum("proof_point_type"),
  subject: text("subject"),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  deliveryStatus: deliveryStatusEnum("delivery_status").notNull().default("sent"),
  bounceStatus: bounceStatusEnum("bounce_status").notNull().default("none"),
  replyStatus: replyStatusEnum("reply_status").notNull().default("none"),
  metadata: jsonb("metadata").notNull().default({}),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('simple', coalesce(subject, '') || ' ' || body)`),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_messages_has_target", sql`(${table.personId} is not null or ${table.organizationId} is not null)`),
  check("outreach_messages_module_needs_route", sql`(${table.routeModuleId} is null or ${table.routeId} is not null)`),
  check("outreach_messages_bounced_not_delivered", sql`not (${table.bounceStatus} <> 'none' and ${table.deliveryStatus} = 'delivered')`),
  foreignKey({ name: "outreach_messages_route_module_in_route_fk", columns: [table.routeId, table.routeModuleId], foreignColumns: [routeModules.routeId, routeModules.id] }).onDelete("restrict"),
  index("outreach_messages_prospect_sent_index").on(table.prospectId, table.sentAt.desc()),
  index("outreach_messages_sent_at_index").on(table.sentAt.desc()),
  index("outreach_messages_organization_id_index").on(table.organizationId),
  index("outreach_messages_person_id_index").on(table.personId),
  index("outreach_messages_campaign_id_index").on(table.campaignId),
  index("outreach_messages_channel_index").on(table.channel),
  index("outreach_messages_search_vector_index").using("gin", table.searchVector)
]);

/** Communication after the initial outreach, including replies. Appended, never overwriting the original outreach. */
export const interactions = pgTable("interactions", {
  id: id(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  outreachMessageId: uuid("outreach_message_id").references(() => outreachMessages.id, { onDelete: "restrict" }),
  direction: interactionDirectionEnum("direction").notNull(),
  channel: outreachChannelEnum("channel").notNull(),
  type: interactionTypeEnum("type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  subject: text("subject"),
  body: text("body"),
  /** 1-based position in `responseDepthLabels`; set by explicit classification, never inferred. */
  responseDepth: smallint("response_depth"),
  sentiment: sentimentEnum("sentiment"),
  metadata: jsonb("metadata").notNull().default({}),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('simple', coalesce(subject, '') || ' ' || coalesce(body, ''))`),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("interactions_response_depth_range", sql`(${table.responseDepth} is null or ${table.responseDepth} between 1 and ${sql.raw(String(maxResponseDepth))})`),
  index("interactions_prospect_occurred_index").on(table.prospectId, table.occurredAt.desc()),
  index("interactions_outreach_message_id_index").on(table.outreachMessageId),
  index("interactions_response_depth_index").on(table.responseDepth).where(sql`${table.responseDepth} is not null`),
  index("interactions_search_vector_index").using("gin", table.searchVector)
]);

/** An explicit task, not a hidden date field. Only an active follow-up may carry a due date. */
export const followUps = pgTable("follow_ups", {
  id: id(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  status: followUpStatusEnum("status").notNull().default("active"),
  reason: text("reason").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  /** "Not before" for warm future leads: the earliest sensible moment, not a deadline. */
  notBeforeAt: timestamp("not_before_at", { withTimezone: true }),
  suggestedChannel: outreachChannelEnum("suggested_channel"),
  originOutreachMessageId: uuid("origin_outreach_message_id").references(() => outreachMessages.id, { onDelete: "restrict" }),
  originInteractionId: uuid("origin_interaction_id").references(() => interactions.id, { onDelete: "restrict" }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  dismissedReason: text("dismissed_reason"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("follow_ups_due_needs_active", sql`(${table.dueAt} is null or ${table.status} = 'active')`),
  check("follow_ups_completed_at_matches_status", sql`((${table.status} = 'completed') = (${table.completedAt} is not null))`),
  check("follow_ups_dismissed_reason_matches_status", sql`(${table.dismissedReason} is null or ${table.status} = 'dismissed')`),
  check("follow_ups_reason_length", sql`char_length(${table.reason}) between 1 and 500`),
  index("follow_ups_prospect_id_index").on(table.prospectId),
  index("follow_ups_active_due_index").on(table.dueAt).where(sql`${table.status} = 'active'`)
]);
