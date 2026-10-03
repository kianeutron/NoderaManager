import { sql } from "drizzle-orm";
import { check, foreignKey, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./columns";
import { campaignStatusEnum, signalTypeEnum } from "./crm-enums";
import { prospects, routeModules, routes } from "./core";

/** A bounded initiative with a goal and time window. Routes and prospects join through the tables below. */
export const campaigns = pgTable("campaigns", {
  id: id(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  goal: text("goal"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  /** Structured targeting rules; unknown until validated by the campaigns schema at the boundary. */
  targetingRules: jsonb("targeting_rules").notNull().default({}),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("campaigns_window_ordered", sql`(${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} >= ${table.startsAt})`),
  check("campaigns_name_length", sql`char_length(${table.name}) between 1 and 120`),
  uniqueIndex("campaigns_normalized_name_unique").on(table.normalizedName),
  index("campaigns_status_index").on(table.status)
]);

/** Campaign * --- * Route/Module. A null module means the whole route. */
export const campaignRoutes = pgTable("campaign_routes", {
  id: id(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "restrict" }),
  routeId: uuid("route_id").notNull().references(() => routes.id, { onDelete: "restrict" }),
  routeModuleId: uuid("route_module_id"),
  createdAt: createdAt()
}, (table) => [
  foreignKey({ name: "campaign_routes_route_module_in_route_fk", columns: [table.routeId, table.routeModuleId], foreignColumns: [routeModules.routeId, routeModules.id] }).onDelete("restrict"),
  uniqueIndex("campaign_routes_whole_route_unique").on(table.campaignId, table.routeId).where(sql`${table.routeModuleId} is null`),
  uniqueIndex("campaign_routes_module_unique").on(table.campaignId, table.routeId, table.routeModuleId).where(sql`${table.routeModuleId} is not null`)
]);

export const campaignProspects = pgTable("campaign_prospects", {
  id: id(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "restrict" }),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  createdAt: createdAt()
}, (table) => [
  uniqueIndex("campaign_prospects_campaign_prospect_unique").on(table.campaignId, table.prospectId),
  index("campaign_prospects_prospect_id_index").on(table.prospectId)
]);

/** Evidence that makes contact timely (a live role, a client win). It never monitors anything by itself. */
export const signals = pgTable("signals", {
  id: id(),
  prospectId: uuid("prospect_id").notNull().references(() => prospects.id, { onDelete: "restrict" }),
  type: signalTypeEnum("type").notNull(),
  summary: text("summary").notNull(),
  sourceUrl: text("source_url"),
  observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt()
}, (table) => [
  check("signals_summary_length", sql`char_length(${table.summary}) between 1 and 500`),
  check("signals_expiry_after_observation", sql`(${table.expiresAt} is null or ${table.expiresAt} >= ${table.observedAt})`),
  index("signals_prospect_id_index").on(table.prospectId),
  index("signals_type_index").on(table.type)
]);
