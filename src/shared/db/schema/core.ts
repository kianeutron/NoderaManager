import { sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, check, foreignKey, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tsvector, updatedAt } from "./columns";
import { organizationSizeBandEnum, organizationTypeEnum, personaEnum, personLinkTypeEnum, prospectSourceEnum, prospectStatusEnum, prospectTemperatureEnum, structuralReasonEnum } from "./crm-enums";

export const actorTypeValues = ["user", "mcp", "import", "system"] as const;
export const actorTypeEnum = pgEnum("actor_type", actorTypeValues);

// Country codes are ISO 3166-1 alpha-2 so the map and country statistics can group reliably.
const isoCountryCode = (column: AnyPgColumn) => sql`(${column} is null or ${column} ~ '^[A-Z]{2}$')`;

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull(),
  normalizedEmail: text("normalized_email").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt()
}, (table) => [uniqueIndex("users_normalized_email_unique").on(table.normalizedEmail)]);

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  organizationType: organizationTypeEnum("organization_type").notNull().default("company"),
  sizeBand: organizationSizeBandEnum("size_band"),
  websiteUrl: text("website_url"),
  linkedinUrl: text("linkedin_url"),
  countryCode: text("country_code"),
  industry: text("industry"),
  notes: text("notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("organizations_country_code_iso", isoCountryCode(table.countryCode)),
  index("organizations_normalized_name_index").on(table.normalizedName),
  index("organizations_normalized_name_trgm_index").using("gin", sql`${table.normalizedName} gin_trgm_ops`),
  index("organizations_country_code_index").on(table.countryCode),
  // Keyset sort orders for the organization list (see shared/db/keyset.ts); each matches its ORDER BY exactly.
  index("organizations_updated_sort_index").on(sql`${table.updatedAt} desc`, sql`${table.id} desc`).where(sql`${table.archivedAt} is null`),
  index("organizations_name_sort_index").on(table.normalizedName, table.id).where(sql`${table.archivedAt} is null`)
]);

export const organizationDomains = pgTable("organization_domains", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  domain: text("domain").notNull(),
  isCanonical: boolean("is_canonical").notNull().default(false),
  createdAt: createdAt()
}, (table) => [
  uniqueIndex("organization_domains_domain_unique").on(table.domain),
  uniqueIndex("organization_domains_one_canonical_unique").on(table.organizationId).where(sql`${table.isCanonical}`)
]);

/** Identity only. Why someone was targeted, their status and temperature belong to the Prospect (data-model.md). */
export const people = pgTable("people", {
  id: id(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  fullName: text("full_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  linkedinUrl: text("linkedin_url"),
  normalizedLinkedinUrl: text("normalized_linkedin_url"),
  role: text("role"),
  persona: personaEnum("persona"),
  countryCode: text("country_code"),
  city: text("city"),
  /** ISO 639-1 codes, validated at the boundary. */
  languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
  doNotContactAt: timestamp("do_not_contact_at", { withTimezone: true }),
  doNotContactReason: text("do_not_contact_reason"),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("people_country_code_iso", isoCountryCode(table.countryCode)),
  check("people_do_not_contact_reason_needs_flag", sql`(${table.doNotContactReason} is null or ${table.doNotContactAt} is not null)`),
  index("people_organization_id_index").on(table.organizationId),
  index("people_persona_index").on(table.persona),
  index("people_country_code_index").on(table.countryCode),
  index("people_last_contacted_at_index").on(table.lastContactedAt),
  index("people_normalized_name_trgm_index").using("gin", sql`${table.normalizedName} gin_trgm_ops`),
  index("people_updated_sort_index").on(sql`${table.updatedAt} desc`, sql`${table.id} desc`).where(sql`${table.archivedAt} is null`),
  index("people_name_sort_index").on(table.normalizedName, table.id).where(sql`${table.archivedAt} is null`),
  uniqueIndex("people_normalized_linkedin_unique").on(table.normalizedLinkedinUrl)
]);

export const personEmails = pgTable("person_emails", {
  id: id(),
  personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "restrict" }),
  email: text("email").notNull(),
  normalizedEmail: text("normalized_email").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: createdAt()
}, (table) => [
  uniqueIndex("person_emails_normalized_email_unique").on(table.normalizedEmail),
  uniqueIndex("person_emails_one_primary_unique").on(table.personId).where(sql`${table.isPrimary}`),
  index("person_emails_person_id_index").on(table.personId),
  index("person_emails_normalized_email_trgm_index").using("gin", sql`${table.normalizedEmail} gin_trgm_ops`)
]);

/** Profiles beyond the canonical LinkedIn identity on `people` (website, GitHub, portfolio). */
export const personLinks = pgTable("person_links", {
  id: id(),
  personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "restrict" }),
  type: personLinkTypeEnum("type").notNull(),
  url: text("url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  label: text("label"),
  createdAt: createdAt()
}, (table) => [uniqueIndex("person_links_person_url_unique").on(table.personId, table.normalizedUrl)]);

export const routes = pgTable("routes", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [uniqueIndex("routes_name_unique").on(sql`lower(${table.name})`)]);

export const routeModules = pgTable("route_modules", {
  id: id(),
  routeId: uuid("route_id").notNull().references(() => routes.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  uniqueIndex("route_modules_route_name_unique").on(table.routeId, sql`lower(${table.name})`),
  // Lets other tables prove a module belongs to the route they name (composite foreign keys).
  uniqueIndex("route_modules_route_id_id_unique").on(table.routeId, table.id)
]);

export const prospects = pgTable("prospects", {
  id: id(),
  personId: uuid("person_id").references(() => people.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "restrict" }),
  routeId: uuid("route_id").notNull().references(() => routes.id, { onDelete: "restrict" }),
  routeModuleId: uuid("route_module_id"),
  status: prospectStatusEnum("status").notNull().default("researched"),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).defaultNow().notNull(),
  temperature: prospectTemperatureEnum("temperature"),
  source: prospectSourceEnum("source"),
  whyTargeted: text("why_targeted"),
  currentTrigger: text("current_trigger"),
  structuralReason: structuralReasonEnum("structural_reason"),
  nextAction: text("next_action"),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('simple', coalesce(why_targeted, '') || ' ' || coalesce(current_trigger, '') || ' ' || coalesce(next_action, ''))`),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [
  check("prospect_has_identity", sql`(${table.personId} is not null or ${table.organizationId} is not null)`),
  foreignKey({ name: "prospects_route_module_in_route_fk", columns: [table.routeId, table.routeModuleId], foreignColumns: [routeModules.routeId, routeModules.id] }).onDelete("restrict"),
  index("prospects_status_index").on(table.status),
  index("prospects_route_id_index").on(table.routeId),
  index("prospects_person_id_index").on(table.personId),
  index("prospects_organization_id_index").on(table.organizationId),
  index("prospects_last_contacted_at_index").on(table.lastContactedAt),
  index("prospects_updated_sort_index").on(sql`${table.updatedAt} desc`, sql`${table.id} desc`).where(sql`${table.archivedAt} is null`),
  index("prospects_search_vector_index").using("gin", table.searchVector)
]);

export const auditEvents = pgTable("audit_events", {
  id: id(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  requestId: text("request_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  source: text("source").notNull(),
  summary: text("summary").notNull(),
  /** Optional structured diff and context. Bump `metadataVersion` when its shape changes. */
  metadata: jsonb("metadata").notNull().default({}),
  metadataVersion: smallint("metadata_version").notNull().default(1)
}, (table) => [index("audit_events_entity_index").on(table.entityType, table.entityId), index("audit_events_occurred_at_index").on(table.occurredAt)]);
