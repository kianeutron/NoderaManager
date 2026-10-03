import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns";
import { campaigns } from "./strategy";
import { interactions, outreachMessages } from "./engagement";
import { organizations, people, prospects, users } from "./core";
import { outreachChannelEnum, outreachTaskStatusEnum, outreachTaskTypeEnum, providerAccountStatusEnum, sequenceEnrollmentStatusEnum, sequenceStatusEnum, templateStatusEnum, draftStatusEnum } from "./crm-enums";

/** Reusable, versionable copy blocks. Credentials and provider tokens never belong here. */
export const outreachTemplates = pgTable("outreach_templates", {
  id: id(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  channel: outreachChannelEnum("channel").notNull(),
  subjectTemplate: text("subject_template"),
  bodyTemplate: text("body_template").notNull(),
  variables: jsonb("variables").notNull().default([]),
  status: templateStatusEnum("status").notNull().default("active"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_templates_name_length", sql`char_length(${table.name}) between 1 and 120`),
  check("outreach_templates_body_length", sql`char_length(${table.bodyTemplate}) between 1 and 20000`),
  uniqueIndex("outreach_templates_normalized_name_channel_unique").on(table.normalizedName, table.channel),
  index("outreach_templates_status_index").on(table.status)
]);

/** A manually authored message before it becomes immutable outreach history. */
export const outreachDrafts = pgTable("outreach_drafts", {
  id: id(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "restrict" }),
  templateId: uuid("template_id").references(() => outreachTemplates.id, { onDelete: "set null" }),
  channel: outreachChannelEnum("channel").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  status: draftStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_drafts_has_target", sql`(${table.personId} is not null or ${table.organizationId} is not null)`),
  check("outreach_drafts_scheduled_at_matches_status", sql`(${table.status} <> 'scheduled' or ${table.scheduledAt} is not null)`),
  index("outreach_drafts_prospect_index").on(table.prospectId),
  index("outreach_drafts_status_schedule_index").on(table.status, table.scheduledAt)
]);

/** A campaign sequence definition. Steps are independently ordered and auditable. */
export const outreachSequences = pgTable("outreach_sequences", {
  id: id(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  status: sequenceStatusEnum("status").notNull().default("draft"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_sequences_name_length", sql`char_length(${table.name}) between 1 and 120`),
  uniqueIndex("outreach_sequences_campaign_name_unique").on(table.campaignId, table.normalizedName),
  index("outreach_sequences_status_index").on(table.status)
]);

export const outreachSequenceSteps = pgTable("outreach_sequence_steps", {
  id: id(),
  sequenceId: uuid("sequence_id").notNull().references(() => outreachSequences.id, { onDelete: "restrict" }),
  stepOrder: smallint("step_order").notNull(),
  delayHours: integer("delay_hours").notNull().default(0),
  templateId: uuid("template_id").notNull().references(() => outreachTemplates.id, { onDelete: "restrict" }),
  channel: outreachChannelEnum("channel").notNull(),
  stopOnReply: boolean("stop_on_reply").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_sequence_steps_order_positive", sql`${table.stepOrder} >= 1`),
  check("outreach_sequence_steps_delay_nonnegative", sql`${table.delayHours} >= 0`),
  uniqueIndex("outreach_sequence_steps_order_unique").on(table.sequenceId, table.stepOrder),
  index("outreach_sequence_steps_template_index").on(table.templateId)
]);

export const outreachSequenceEnrollments = pgTable("outreach_sequence_enrollments", {
  id: id(),
  sequenceId: uuid("sequence_id").notNull().references(() => outreachSequences.id, { onDelete: "restrict" }),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  currentStepOrder: smallint("current_step_order").notNull().default(1),
  status: sequenceEnrollmentStatusEnum("status").notNull().default("active"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_sequence_enrollments_step_positive", sql`${table.currentStepOrder} >= 1`),
  check("outreach_sequence_enrollments_completed_matches_status", sql`((${table.status} = 'completed') = (${table.completedAt} is not null))`),
  uniqueIndex("outreach_sequence_enrollments_sequence_prospect_unique").on(table.sequenceId, table.prospectId),
  index("outreach_sequence_enrollments_due_index").on(table.nextRunAt).where(sql`${table.status} = 'active'`),
  index("outreach_sequence_enrollments_prospect_index").on(table.prospectId)
]);

/** Provider account metadata only; OAuth tokens are kept in the deployment secret store. */
export const outreachProviderAccounts = pgTable("outreach_provider_accounts", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  provider: text("provider").notNull(),
  externalAccountId: text("external_account_id").notNull(),
  displayName: text("display_name").notNull(),
  status: providerAccountStatusEnum("status").notNull().default("active"),
  metadata: jsonb("metadata").notNull().default({}),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_provider_accounts_provider_length", sql`char_length(${table.provider}) between 1 and 40`),
  uniqueIndex("outreach_provider_accounts_external_unique").on(table.provider, table.externalAccountId),
  index("outreach_provider_accounts_user_index").on(table.userId)
]);

export const outreachTasks = pgTable("outreach_tasks", {
  id: id(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  originMessageId: uuid("origin_message_id").references(() => outreachMessages.id, { onDelete: "set null" }),
  originInteractionId: uuid("origin_interaction_id").references(() => interactions.id, { onDelete: "set null" }),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  type: outreachTaskTypeEnum("type").notNull().default("follow_up"),
  status: outreachTaskStatusEnum("status").notNull().default("open"),
  title: text("title").notNull(),
  notes: text("notes"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("outreach_tasks_title_length", sql`char_length(${table.title}) between 1 and 200`),
  check("outreach_tasks_completed_matches_status", sql`((${table.status} = 'completed') = (${table.completedAt} is not null))`),
  index("outreach_tasks_prospect_index").on(table.prospectId),
  index("outreach_tasks_assignee_due_index").on(table.assigneeId, table.dueAt),
  index("outreach_tasks_open_due_index").on(table.dueAt).where(sql`${table.status} in ('open', 'in_progress')`)
]);

/** Daily, immutable-ish rollups for fast campaign dashboards; raw events remain authoritative. */
export const campaignDailyStats = pgTable("campaign_daily_stats", {
  id: id(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "restrict" }),
  day: date("day").notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  positiveReplyCount: integer("positive_reply_count").notNull().default(0),
  meetingCount: integer("meeting_count").notNull().default(0),
  opportunityCount: integer("opportunity_count").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("campaign_daily_stats_counts_nonnegative", sql`${table.sentCount} >= 0 and ${table.deliveredCount} >= 0 and ${table.replyCount} >= 0 and ${table.positiveReplyCount} >= 0 and ${table.meetingCount} >= 0 and ${table.opportunityCount} >= 0`),
  uniqueIndex("campaign_daily_stats_campaign_day_unique").on(table.campaignId, table.day),
  index("campaign_daily_stats_day_index").on(table.day)
]);
