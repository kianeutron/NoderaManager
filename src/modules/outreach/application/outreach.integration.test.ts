// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { createOrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { createOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { createOutreachServices } from "@/modules/outreach/application/create-outreach-services";
import { logOutreachInputSchema, outreachSearchQuerySchema } from "@/modules/outreach/domain/outreach.schema";
import { createPeopleServices } from "@/modules/people/application/create-people-services";
import { createPersonInputSchema } from "@/modules/people/domain/person.schema";
import { createProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { createProspectInputSchema } from "@/modules/prospects/domain/prospect.schema";
import { createRoutesServices } from "@/modules/routes/application/create-routes-services";
import { createRouteInputSchema } from "@/modules/routes/domain/route.schema";
import { auditEvents, organizations, people, personEmails, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { outreachMessages } from "@/shared/db/schema/engagement";
import { idempotencyKeys } from "@/shared/db/schema/integration";
import { createActor } from "@/test/factories/actors";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("Outreach (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const actor = createActor({ id: `client-${suffix}`, requestId: `request-${suffix}`, source: `outreach-test-${suffix}` });
  const outreach = createOutreachServices({ database });
  const peopleServices = createPeopleServices({ database });
  const organizationsServices = createOrganizationsServices({ database });
  const prospectsServices = createProspectsServices({ database });
  const routesServices = createRoutesServices({ database });
  const name = (label: string) => `${label} ${suffix}`;

  async function seedProspect(label: string, options: { status?: "researched" | "ready"; doNotContact?: boolean; onlyOrganization?: boolean } = {}) {
    const route = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name(`Route ${label}`) }));
    const person = options.onlyOrganization ? null : await peopleServices.createPerson(actor, createPersonInputSchema.parse({ fullName: name(label) }));
    const organization = await organizationsServices.createOrganization(actor, createOrganizationInputSchema.parse({ name: name(`Org ${label}`) }));
    const prospect = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ ...(person ? { personId: person.personId } : {}), organizationId: organization.organizationId, routeId: route.routeId, status: options.status ?? "ready" }));
    if (person && options.doNotContact) await peopleServices.markPersonDoNotContact(actor, { personId: person.personId, reason: "Asked to stop" });
    return { prospectId: prospect.prospectId, personId: person?.personId ?? null, organizationId: organization.organizationId, routeId: route.routeId };
  }
  const log = (prospectId: string, extra: Record<string, unknown> = {}) => outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId, channel: "email", body: name("Hello"), ...extra }));
  const find = async (q: string) => (await outreach.searchOutreach(outreachSearchQuerySchema.parse({ q }))).items;

  afterAll(async () => {
    const personIds = (await database.select({ id: people.id }).from(people).where(like(people.fullName, `%${suffix}%`))).map((row) => row.id);
    const organizationIds = (await database.select({ id: organizations.id }).from(organizations).where(like(organizations.name, `%${suffix}%`))).map((row) => row.id);
    const prospectIds = (await database.select({ id: prospects.id }).from(prospects).innerJoin(routes, eq(routes.id, prospects.routeId)).where(like(routes.name, `%${suffix}%`))).map((row) => row.id);

    if (prospectIds.length > 0) {
      await database.delete(outreachMessages).where(inArray(outreachMessages.prospectId, prospectIds));
      await database.delete(prospects).where(inArray(prospects.id, prospectIds));
    }
    await database.delete(idempotencyKeys).where(eq(idempotencyKeys.source, actor.source));
    if (personIds.length > 0) {
      await database.delete(personEmails).where(inArray(personEmails.personId, personIds));
      await database.delete(people).where(inArray(people.id, personIds));
    }
    if (organizationIds.length > 0) await database.delete(organizations).where(inArray(organizations.id, organizationIds));
    await database.delete(routeModules).where(like(routeModules.name, `%${suffix}%`));
    await database.delete(routes).where(like(routes.name, `%${suffix}%`));
    await database.delete(auditEvents).where(eq(auditEvents.requestId, actor.requestId));
  });

  describe("logging", () => {
    it("files the message under the prospect's contacts and, in the same commit, updates the prospect, the person and the audit trail", async () => {
      const seeded = await seedProspect("First contact", { status: "ready" });
      const sentAt = new Date(Date.now() - 60 * 60 * 1000);
      const result = await log(seeded.prospectId, { subject: name("Intro"), sentAt: sentAt.toISOString() });

      expect(result).toMatchObject({ created: true, prospectStatus: "contacted" });
      const [message] = await database.select().from(outreachMessages).where(eq(outreachMessages.id, result.messageId));
      expect(message).toMatchObject({ prospectId: seeded.prospectId, personId: seeded.personId, organizationId: seeded.organizationId, routeId: seeded.routeId, channel: "email", deliveryStatus: "sent", replyStatus: "none" });
      expect(message?.sentAt.getTime()).toBe(sentAt.getTime());

      const prospect = await prospectsServices.getProspect(seeded.prospectId);
      expect(prospect).toMatchObject({ status: "contacted", lastContactedAt: sentAt.toISOString() });
      expect((await peopleServices.getPerson(seeded.personId as string))?.lastContactedAt).toBe(sentAt.toISOString());

      const audit = await database.select({ action: auditEvents.action, metadata: auditEvents.metadata }).from(auditEvents).where(eq(auditEvents.entityId, result.messageId));
      expect(audit).toEqual([{ action: "outreach.logged", metadata: expect.objectContaining({ statusChange: { from: "ready", to: "contacted" } }) }]);
      expect(JSON.stringify(audit)).not.toContain(name("Hello"));
    });

    it("never moves last-contacted backwards when an older message is logged later", async () => {
      const seeded = await seedProspect("Older message");
      const recent = new Date(Date.now() - 60 * 60 * 1000);
      await log(seeded.prospectId, { body: name("Recent"), sentAt: recent.toISOString() });
      await log(seeded.prospectId, { body: name("Earlier"), sentAt: new Date(recent.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() });

      expect((await prospectsServices.getProspect(seeded.prospectId))?.lastContactedAt).toBe(recent.toISOString());
      expect((await peopleServices.getPerson(seeded.personId as string))?.lastContactedAt).toBe(recent.toISOString());
    });

    it("logs against an organization-only prospect, leaving people alone", async () => {
      const seeded = await seedProspect("Company only", { onlyOrganization: true });
      const result = await log(seeded.prospectId);

      const [message] = await database.select({ personId: outreachMessages.personId, organizationId: outreachMessages.organizationId }).from(outreachMessages).where(eq(outreachMessages.id, result.messageId));
      expect(message).toEqual({ personId: null, organizationId: seeded.organizationId });
    });

    it("refuses a do-not-contact person and writes nothing", async () => {
      const seeded = await seedProspect("Do not contact", { doNotContact: true });

      await expect(log(seeded.prospectId)).rejects.toMatchObject({ code: "conflict", reason: "person_do_not_contact" });
      expect(await database.select({ id: outreachMessages.id }).from(outreachMessages).where(eq(outreachMessages.prospectId, seeded.prospectId))).toEqual([]);
      expect((await prospectsServices.getProspect(seeded.prospectId))?.status).toBe("ready");
    });

    it("refuses a closed prospect and an archived person", async () => {
      const closed = await seedProspect("Closed one");
      await prospectsServices.updateProspectStatus(actor, { prospectId: closed.prospectId, status: "lost" });
      await expect(log(closed.prospectId)).rejects.toMatchObject({ reason: "prospect_closed" });

      const archived = await seedProspect("Archived one");
      await peopleServices.archivePerson(actor, { personId: archived.personId as string });
      await expect(log(archived.prospectId)).rejects.toMatchObject({ reason: "contact_archived" });
    });

    it("reports an unknown prospect", async () => {
      await expect(log(uuidv7())).rejects.toMatchObject({ code: "not_found" });
    });
  });

  describe("idempotency", () => {
    it("returns the first message for a repeated key, stores one row, and refuses the key for a different message", async () => {
      const seeded = await seedProspect("Idempotent");
      const key = `key-${suffix}-a`;
      const first = await log(seeded.prospectId, { idempotencyKey: key });
      const again = await log(seeded.prospectId, { idempotencyKey: key });

      expect(first.created).toBe(true);
      expect(again).toMatchObject({ messageId: first.messageId, created: false, auditEventId: null });
      expect(await database.select({ id: outreachMessages.id }).from(outreachMessages).where(eq(outreachMessages.prospectId, seeded.prospectId))).toHaveLength(1);
      await expect(log(seeded.prospectId, { idempotencyKey: key, body: name("Something else") })).rejects.toMatchObject({ reason: "idempotency_key_reused" });
    });

    it("treats identical text sent moments ago as a double submit, but a different channel as a new message", async () => {
      const seeded = await seedProspect("Double submit");
      const first = await log(seeded.prospectId);
      const second = await log(seeded.prospectId);
      const otherChannel = await log(seeded.prospectId, { channel: "linkedin" });

      expect(second).toMatchObject({ messageId: first.messageId, created: false });
      expect(otherChannel.created).toBe(true);
      expect(await database.select({ id: outreachMessages.id }).from(outreachMessages).where(eq(outreachMessages.prospectId, seeded.prospectId))).toHaveLength(2);
    });
  });

  describe("reading", () => {
    it("finds messages by name as you type, by words in the text, and treats % and _ literally", async () => {
      const seeded = await seedProspect("Searchable");
      await log(seeded.prospectId, { body: `Zebrafinch partnership ${suffix}` });

      expect((await find(name("Searchable").slice(0, 12))).length).toBeGreaterThan(0);
      expect((await find(`zebrafinch`)).map((item) => item.prospectId)).toContain(seeded.prospectId);
      expect(await find("%")).toEqual([]);
      expect(await find("_")).toEqual([]);
    });

    it("returns detail with the prospect and route, and null for an unknown id", async () => {
      const seeded = await seedProspect("Detail");
      const { messageId } = await log(seeded.prospectId, { body: name("Full text here") });

      expect(await outreach.getOutreachMessage(messageId)).toMatchObject({ body: name("Full text here"), bounceStatus: "none", prospect: { id: seeded.prospectId, status: "contacted", routeName: name("Route Detail"), moduleName: null }, person: { id: seeded.personId } });
      expect(await outreach.getOutreachMessage(uuidv7())).toBeNull();
    });

    it("pages newest first without skipping or repeating, counting once", async () => {
      const seeded = await seedProspect("Paging");
      const base = Date.now() - 24 * 60 * 60 * 1000;
      const ids: string[] = [];
      for (const index of [0, 1, 2, 3, 4]) ids.push((await log(seeded.prospectId, { body: name(`Message ${index}`), channel: "other", sentAt: new Date(base + index * 60_000).toISOString() })).messageId);

      const seen: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const page = await outreach.searchOutreach(outreachSearchQuerySchema.parse({ prospectId: seeded.prospectId, limit: 2, ...(cursor ? { cursor } : {}) }));
        if (pages === 0) expect(page.total).toBe(5);
        else expect(page.total).toBeNull();
        seen.push(...page.items.map((item) => item.id));
        cursor = page.nextCursor ?? undefined;
        pages += 1;
      } while (cursor);

      expect(seen).toEqual([...ids].reverse());
      expect(pages).toBe(3);
    });

    it("summarizes every message, not one page", async () => {
      const before = await outreach.getOutreachSummary();
      const seeded = await seedProspect("Summary");
      await log(seeded.prospectId);

      const after = await outreach.getOutreachSummary();
      expect(after.total).toBe(before.total + 1);
      expect(after.last7Days).toBe(before.last7Days + 1);
    });

    it("offers only prospects a message can go to", async () => {
      const open = await seedProspect("Pickable");
      const blocked = await seedProspect("Pickable blocked", { doNotContact: true });
      const closed = await seedProspect("Pickable closed");
      await prospectsServices.updateProspectStatus(actor, { prospectId: closed.prospectId, status: "won" });

      const targets = (await outreach.listOutreachTargets({ q: name("Pickable").slice(0, 12) })).map((target) => target.prospectId);
      expect(targets).toContain(open.prospectId);
      expect(targets).not.toContain(blocked.prospectId);
      expect(targets).not.toContain(closed.prospectId);
    });
  });
});
