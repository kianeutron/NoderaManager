// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { auditEvents, organizationDomains, organizations, people, personEmails, personLinks, prospects, routeModules, routes, users } from "@/shared/db/schema/core";
import { followUps, interactions, outreachMessages } from "@/shared/db/schema/engagement";
import { externalRefs, idempotencyKeys } from "@/shared/db/schema/integration";
import { documentLinks, documents } from "@/shared/db/schema/library";
import { noteLinks, notes } from "@/shared/db/schema/notes";
import { campaignProspects, campaignRoutes, campaigns, signals } from "@/shared/db/schema/strategy";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("CRM schema constraints (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  let sequence = 0;
  const name = (label: string) => `${label} ${suffix}`;
  const unique = (label: string) => `${label} ${suffix} ${sequence++}`;
  const created = { routes: [] as string[], modules: [] as string[], organizations: [] as string[], people: [] as string[], prospects: [] as string[], messages: [] as string[], interactions: [] as string[] };

  /** Every violation is asserted by constraint name, so a test cannot pass for the wrong reason. Drizzle wraps the database error, so its message lives in `cause`. */
  async function violates(attempt: PromiseLike<unknown>, constraint: string) {
    const error = await Promise.resolve(attempt).then(() => undefined, (failure: unknown) => failure ?? new Error("rejected without a reason"));
    if (error === undefined) throw new Error(`Expected a violation of ${constraint}, but the statement succeeded`);
    const messages = [error, error instanceof Error ? error.cause : undefined].map((part) => (part instanceof Error ? part.message : ""));
    expect(messages.join(" | ")).toContain(constraint);
  }

  async function seedRoute() {
    const routeId = uuidv7();
    const moduleId = uuidv7();
    await database.insert(routes).values({ id: routeId, name: unique("Route") });
    await database.insert(routeModules).values({ id: moduleId, routeId, name: unique("Module") });
    created.routes.push(routeId);
    created.modules.push(moduleId);
    return { routeId, moduleId };
  }

  async function seedProspect(overrides: Partial<typeof prospects.$inferInsert> = {}) {
    const { routeId, moduleId } = await seedRoute();
    const personId = uuidv7();
    await database.insert(people).values({ id: personId, fullName: name("Ann"), normalizedName: name("ann") });
    const prospectId = uuidv7();
    await database.insert(prospects).values({ id: prospectId, personId, routeId, routeModuleId: moduleId, ...overrides });
    created.people.push(personId);
    created.prospects.push(prospectId);
    return { routeId, moduleId, personId, prospectId };
  }

  async function seedMessage(prospect: { prospectId: string; personId: string }, overrides: Partial<typeof outreachMessages.$inferInsert> = {}) {
    const id = uuidv7();
    await database.insert(outreachMessages).values({ id, prospectId: prospect.prospectId, personId: prospect.personId, channel: "email", body: "Hello", sentAt: new Date(), ...overrides });
    created.messages.push(id);
    return id;
  }

  afterAll(async () => {
    await database.delete(idempotencyKeys).where(like(idempotencyKeys.key, `%${suffix}%`));
    await database.delete(externalRefs).where(like(externalRefs.externalId, `%${suffix}%`));
    const noteRows = await database.select({ id: notes.id }).from(notes).where(like(notes.body, `%${suffix}%`));
    if (noteRows.length > 0) {
      await database.delete(noteLinks).where(inArray(noteLinks.noteId, noteRows.map((row) => row.id)));
      await database.delete(notes).where(inArray(notes.id, noteRows.map((row) => row.id)));
    }
    if (created.prospects.length > 0) {
      await database.delete(followUps).where(inArray(followUps.prospectId, created.prospects));
      await database.delete(interactions).where(inArray(interactions.prospectId, created.prospects));
      await database.delete(outreachMessages).where(inArray(outreachMessages.prospectId, created.prospects));
      await database.delete(signals).where(inArray(signals.prospectId, created.prospects));
      await database.delete(campaignProspects).where(inArray(campaignProspects.prospectId, created.prospects));
      await database.delete(prospects).where(inArray(prospects.id, created.prospects));
    }
    const campaignRows = await database.select({ id: campaigns.id }).from(campaigns).where(like(campaigns.normalizedName, `%${suffix}%`));
    if (campaignRows.length > 0) {
      const campaignIds = campaignRows.map((row) => row.id);
      await database.delete(documentLinks).where(inArray(documentLinks.campaignId, campaignIds));
      await database.delete(campaignRoutes).where(inArray(campaignRoutes.campaignId, campaignIds));
      await database.delete(campaigns).where(inArray(campaigns.id, campaignIds));
    }
    await database.delete(documents).where(like(documents.title, `%${suffix}%`));
    await database.delete(personLinks).where(inArray(personLinks.personId, created.people));
    await database.delete(personEmails).where(inArray(personEmails.personId, created.people));
    await database.delete(people).where(inArray(people.id, created.people));
    await database.delete(organizationDomains).where(inArray(organizationDomains.organizationId, created.organizations));
    await database.delete(organizations).where(inArray(organizations.id, created.organizations));
    await database.delete(routeModules).where(inArray(routeModules.id, created.modules));
    await database.delete(routes).where(inArray(routes.id, created.routes));
    await database.delete(auditEvents).where(like(auditEvents.summary, `%${suffix}%`));
    await database.delete(users).where(like(users.normalizedEmail, `%${suffix}%`));
  });

  describe("route and module integrity", () => {
    it("rejects a prospect whose module belongs to a different route", async () => {
      const other = await seedRoute();
      const personId = uuidv7();
      await database.insert(people).values({ id: personId, fullName: name("Bo"), normalizedName: name("bo") });
      created.people.push(personId);
      const { routeId } = await seedRoute();

      await violates(database.insert(prospects).values({ personId, routeId, routeModuleId: other.moduleId }), "prospects_route_module_in_route_fk");
    });

    it("accepts a prospect with no module, and one whose module matches its route", async () => {
      const seeded = await seedProspect();
      const [row] = await database.select({ status: prospects.status, changedAt: prospects.statusChangedAt }).from(prospects).where(eq(prospects.id, seeded.prospectId));
      expect(row?.status).toBe("researched");
      await seedProspect({ routeModuleId: null });
    });

    it("requires an outreach module to name its route", async () => {
      const prospect = await seedProspect();
      await violates(seedMessage(prospect, { routeModuleId: prospect.moduleId, routeId: null }), "outreach_messages_module_needs_route");
      await violates(seedMessage(prospect, { routeId: (await seedRoute()).routeId, routeModuleId: prospect.moduleId }), "outreach_messages_route_module_in_route_fk");
    });

    it("keeps a campaign's route/module pairs consistent and unique", async () => {
      const first = await seedRoute();
      const second = await seedRoute();
      const campaignId = uuidv7();
      await database.insert(campaigns).values({ id: campaignId, name: name("Camp"), normalizedName: name("camp") });

      await violates(database.insert(campaignRoutes).values({ campaignId, routeId: first.routeId, routeModuleId: second.moduleId }), "campaign_routes_route_module_in_route_fk");
      await database.insert(campaignRoutes).values({ campaignId, routeId: first.routeId });
      await violates(database.insert(campaignRoutes).values({ campaignId, routeId: first.routeId }), "campaign_routes_whole_route_unique");
      await database.insert(campaignRoutes).values({ campaignId, routeId: first.routeId, routeModuleId: first.moduleId });
    });
  });

  describe("identity", () => {
    it("requires a prospect to name a person or an organization", async () => {
      const { routeId } = await seedRoute();

      await violates(database.insert(prospects).values({ routeId }), "prospect_has_identity");
    });

    it("stores country codes as uppercase ISO alpha-2 only", async () => {
      await violates(database.insert(people).values({ fullName: name("Cy"), normalizedName: name("cy"), countryCode: "de" }), "people_country_code_iso");
      await violates(database.insert(organizations).values({ name: name("Org"), normalizedName: name("org"), countryCode: "DEU" }), "organizations_country_code_iso");
      const orgId = uuidv7();
      await database.insert(organizations).values({ id: orgId, name: name("Good"), normalizedName: name("good"), countryCode: "DE" });
      created.organizations.push(orgId);
    });

    it("allows a do-not-contact reason only together with the flag", async () => {
      await violates(database.insert(people).values({ fullName: name("Di"), normalizedName: name("di"), doNotContactReason: "asked to stop" }), "people_do_not_contact_reason_needs_flag");
      const id = uuidv7();
      await database.insert(people).values({ id, fullName: name("Di"), normalizedName: name("di2"), doNotContactAt: new Date(), doNotContactReason: "asked to stop" });
      created.people.push(id);
    });

    it("allows one primary email per person and one canonical domain per organization", async () => {
      const seeded = await seedProspect();
      await database.insert(personEmails).values({ personId: seeded.personId, email: `a-${suffix}@x.io`, normalizedEmail: `a-${suffix}@x.io`, isPrimary: true });
      await violates(database.insert(personEmails).values({ personId: seeded.personId, email: `b-${suffix}@x.io`, normalizedEmail: `b-${suffix}@x.io`, isPrimary: true }), "person_emails_one_primary_unique");
      await database.insert(personEmails).values({ personId: seeded.personId, email: `c-${suffix}@x.io`, normalizedEmail: `c-${suffix}@x.io` });

      const orgId = uuidv7();
      await database.insert(organizations).values({ id: orgId, name: name("Dom"), normalizedName: name("dom") });
      created.organizations.push(orgId);
      await database.insert(organizationDomains).values({ organizationId: orgId, domain: `a-${suffix}.io`, isCanonical: true });
      await violates(database.insert(organizationDomains).values({ organizationId: orgId, domain: `b-${suffix}.io`, isCanonical: true }), "organization_domains_one_canonical_unique");
    });

    it("keeps one link per person and URL", async () => {
      const seeded = await seedProspect();
      const link = { personId: seeded.personId, type: "github" as const, url: `https://github.com/${suffix}`, normalizedUrl: `github.com/${suffix}` };
      await database.insert(personLinks).values(link);
      await violates(database.insert(personLinks).values(link), "person_links_person_url_unique");
    });

    it("rejects retired prospect statuses at the database", async () => {
      const { routeId } = await seedRoute();
      const personId = uuidv7();
      await database.insert(people).values({ id: personId, fullName: name("Ed"), normalizedName: name("ed") });
      created.people.push(personId);

      await violates(database.execute(sql`insert into prospects (id, person_id, route_id, status) values (${uuidv7()}, ${personId}, ${routeId}, 'researching')`), "invalid input value for enum prospect_status");
      const prospectId = uuidv7();
      await database.insert(prospects).values({ id: prospectId, personId, routeId, status: "disqualified", structuralReason: "residency" });
      created.prospects.push(prospectId);
    });
  });

  describe("outreach and engagement", () => {
    it("defaults delivery to unconfirmed and requires a target", async () => {
      const prospect = await seedProspect();
      const id = await seedMessage(prospect, { subject: "Fractional CTO for Acme", body: `Hi Ann, quokka${suffix} team` });
      const [row] = await database.select({ delivery: outreachMessages.deliveryStatus, bounce: outreachMessages.bounceStatus, reply: outreachMessages.replyStatus }).from(outreachMessages).where(eq(outreachMessages.id, id));

      expect(row).toEqual({ delivery: "sent", bounce: "none", reply: "none" });
      await violates(database.insert(outreachMessages).values({ prospectId: prospect.prospectId, channel: "email", body: "x", sentAt: new Date() }), "outreach_messages_has_target");
    });

    it("never marks a bounced message as delivered", async () => {
      const prospect = await seedProspect();

      await violates(seedMessage(prospect, { deliveryStatus: "delivered", bounceStatus: "hard" }), "outreach_messages_bounced_not_delivered");
      await seedMessage(prospect, { deliveryStatus: "failed", bounceStatus: "hard" });
    });

    it("indexes subject and body text for search", async () => {
      const prospect = await seedProspect();
      await seedMessage(prospect, { subject: `Subject ${suffix}`, body: `marmot${suffix} body` });
      const hits = await database.select({ id: outreachMessages.id }).from(outreachMessages).where(sql`${outreachMessages.searchVector} @@ plainto_tsquery('simple', ${`marmot${suffix}`})`);

      expect(hits).toHaveLength(1);
    });

    it("limits response depth to the nine documented levels", async () => {
      const prospect = await seedProspect();
      const base = { prospectId: prospect.prospectId, direction: "inbound" as const, channel: "email" as const, type: "reply" as const, occurredAt: new Date() };

      for (const depth of [0, 10]) await violates(database.insert(interactions).values({ ...base, responseDepth: depth }), "interactions_response_depth_range");
      for (const depth of [1, 9]) await database.insert(interactions).values({ ...base, responseDepth: depth });
      await database.insert(interactions).values(base);
    });

    it("lets only an active follow-up carry a due date", async () => {
      const { prospectId } = await seedProspect();
      const base = { prospectId, reason: "Check in after the holidays" };

      await database.insert(followUps).values({ ...base, dueAt: new Date(Date.now() + 86_400_000) });
      await database.insert(followUps).values({ ...base, notBeforeAt: new Date(Date.now() + 30 * 86_400_000) });
      await database.insert(followUps).values(base);
      await violates(database.insert(followUps).values({ ...base, status: "completed", completedAt: new Date(), dueAt: new Date() }), "follow_ups_due_needs_active");
      await violates(database.insert(followUps).values({ ...base, status: "completed" }), "follow_ups_completed_at_matches_status");
      await violates(database.insert(followUps).values({ ...base, completedAt: new Date() }), "follow_ups_completed_at_matches_status");
      await violates(database.insert(followUps).values({ ...base, dismissedReason: "n/a" }), "follow_ups_dismissed_reason_matches_status");
      await database.insert(followUps).values({ ...base, status: "dismissed", dismissedReason: "Not a fit" });
    });

    it("orders campaign windows and signal expiry", async () => {
      const { prospectId } = await seedProspect();
      const now = Date.now();

      await violates(database.insert(campaigns).values({ name: name("Bad window"), normalizedName: name("bad window"), startsAt: new Date(now), endsAt: new Date(now - 1000) }), "campaigns_window_ordered");
      await violates(database.insert(signals).values({ prospectId, type: "live_role", summary: "Hiring a CTO", observedAt: new Date(now), expiresAt: new Date(now - 1000) }), "signals_expiry_after_observation");
      await database.insert(signals).values({ prospectId, type: "live_role", summary: "Hiring a CTO" });
    });

    it("keeps campaign names and memberships unique", async () => {
      const { prospectId } = await seedProspect();
      const campaignId = uuidv7();
      await database.insert(campaigns).values({ id: campaignId, name: name("Unique"), normalizedName: name("unique") });

      await violates(database.insert(campaigns).values({ name: name("UNIQUE"), normalizedName: name("unique") }), "campaigns_normalized_name_unique");
      await database.insert(campaignProspects).values({ campaignId, prospectId });
      await violates(database.insert(campaignProspects).values({ campaignId, prospectId }), "campaign_prospects_campaign_prospect_unique");
    });

    it("restricts deleting a prospect that has history", async () => {
      const prospect = await seedProspect();
      await seedMessage(prospect);

      await violates(database.delete(prospects).where(eq(prospects.id, prospect.prospectId)), "outreach_messages_prospect_id_prospects_id_fk");
    });
  });

  describe("notes, external references and idempotency", () => {
    it("attaches a note to exactly one record per link and never twice to the same one", async () => {
      const { personId, prospectId } = await seedProspect();
      const noteId = uuidv7();
      await database.insert(notes).values({ id: noteId, body: `Met at the conference ${suffix}` });

      await violates(database.insert(notes).values({ body: "" }), "notes_body_length");
      await violates(database.insert(noteLinks).values({ noteId }), "note_links_single_target");
      await violates(database.insert(noteLinks).values({ noteId, personId, prospectId }), "note_links_single_target");
      await database.insert(noteLinks).values({ noteId, personId });
      await database.insert(noteLinks).values({ noteId, prospectId });
      await violates(database.insert(noteLinks).values({ noteId, personId }), "note_links_person_unique");
    });

    it("resolves one provider message id to exactly one record, while a thread id may tag many", async () => {
      const prospect = await seedProspect();
      const first = await seedMessage(prospect);
      const second = await seedMessage(prospect);
      const gmail = { source: "gmail" as const, externalId: `msg-${suffix}` };

      await violates(database.insert(externalRefs).values({ ...gmail, refType: "message_id" }), "external_refs_single_target");
      await database.insert(externalRefs).values({ ...gmail, refType: "message_id", outreachMessageId: first });
      await violates(database.insert(externalRefs).values({ ...gmail, refType: "message_id", outreachMessageId: second }), "external_refs_message_id_unique");

      const thread = { source: "gmail" as const, refType: "thread_id" as const, externalId: `thread-${suffix}` };
      await database.insert(externalRefs).values({ ...thread, outreachMessageId: first });
      await database.insert(externalRefs).values({ ...thread, outreachMessageId: second });
      await violates(database.insert(externalRefs).values({ ...thread, outreachMessageId: first }), "external_refs_outreach_message_unique");
    });

    it("scopes an idempotency key to its operation and source", async () => {
      const key = { operation: "log_outreach", source: "mcp", key: `key-${suffix}`, requestFingerprint: "abc", expiresAt: new Date(Date.now() + 86_400_000) };

      await database.insert(idempotencyKeys).values(key);
      await violates(database.insert(idempotencyKeys).values(key), "idempotency_keys_operation_source_key_unique");
      await database.insert(idempotencyKeys).values({ ...key, source: "import" });
      await database.insert(idempotencyKeys).values({ ...key, operation: "log_interaction" });
    });
  });

  describe("cross-cutting", () => {
    it("links a library document to a campaign but never to two targets at once", async () => {
      const ownerId = uuidv7();
      await database.insert(users).values({ id: ownerId, email: `o-${suffix}@x.io`, normalizedEmail: `o-${suffix}@x.io`, displayName: "Owner" });
      const documentId = uuidv7();
      await database.insert(documents).values({ id: documentId, title: name("Strategy doc"), createdBy: ownerId });
      const campaignId = uuidv7();
      await database.insert(campaigns).values({ id: campaignId, name: name("Doc camp"), normalizedName: name("doc camp") });
      const { personId } = await seedProspect();

      await database.insert(documentLinks).values({ documentId, campaignId, createdBy: ownerId });
      await violates(database.insert(documentLinks).values({ documentId, campaignId, personId, createdBy: ownerId }), "document_links_single_target");
      await violates(database.insert(documentLinks).values({ documentId, campaignId, createdBy: ownerId }), "document_links_campaign_unique");
    });

    it("versions audit metadata", async () => {
      const id = uuidv7();
      await database.insert(auditEvents).values({ id, actorType: "system", actorId: "test", requestId: "r", action: "test", entityType: "test", entityId: id, source: "test", summary: name("schema test") });
      const [row] = await database.select({ version: auditEvents.metadataVersion }).from(auditEvents).where(eq(auditEvents.id, id));

      expect(row?.version).toBe(1);
    });
  });
});
