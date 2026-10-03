// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { createFollowUpsServices } from "@/modules/followups/application/create-followups-services";
import { createFollowUpInputSchema, followUpSearchQuerySchema } from "@/modules/followups/domain/followup.schema";
import { createInteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import { logInteractionInputSchema } from "@/modules/interactions/domain/interaction.schema";
import { createOrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { createOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { createOutreachServices } from "@/modules/outreach/application/create-outreach-services";
import { logOutreachInputSchema } from "@/modules/outreach/domain/outreach.schema";
import { createPeopleServices } from "@/modules/people/application/create-people-services";
import { createPersonInputSchema } from "@/modules/people/domain/person.schema";
import { createProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { createProspectInputSchema } from "@/modules/prospects/domain/prospect.schema";
import { createRoutesServices } from "@/modules/routes/application/create-routes-services";
import { createRouteInputSchema } from "@/modules/routes/domain/route.schema";
import { auditEvents, organizations, people, personEmails, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { followUps, interactions, outreachMessages } from "@/shared/db/schema/engagement";
import { createActor } from "@/test/factories/actors";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);
const day = 24 * 60 * 60 * 1000;

describe.skipIf(!testDatabaseUrl)("Follow-ups (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const actor = createActor({ id: `client-${suffix}`, requestId: `request-${suffix}`, source: `followups-test-${suffix}` });
  const followUpsServices = createFollowUpsServices({ database });
  const outreach = createOutreachServices({ database });
  const interactionsServices = createInteractionsServices({ database });
  const peopleServices = createPeopleServices({ database });
  const organizationsServices = createOrganizationsServices({ database });
  const prospectsServices = createProspectsServices({ database });
  const routesServices = createRoutesServices({ database });
  const name = (label: string) => `${label} ${suffix}`;

  async function seedProspect(label: string) {
    const route = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name(`Route ${label}`) }));
    const person = await peopleServices.createPerson(actor, createPersonInputSchema.parse({ fullName: name(label) }));
    const organization = await organizationsServices.createOrganization(actor, createOrganizationInputSchema.parse({ name: name(`Org ${label}`) }));
    const prospect = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, organizationId: organization.organizationId, routeId: route.routeId, status: "ready" }));
    return { prospectId: prospect.prospectId, personId: person.personId };
  }
  const create = (prospectId: string, extra: Record<string, unknown> = {}) => followUpsServices.createFollowUp(actor, createFollowUpInputSchema.parse({ prospectId, reason: name("Ask about budget"), ...extra }));
  const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();
  const stored = async (followUpId: string) => (await database.select().from(followUps).where(eq(followUps.id, followUpId)))[0];
  const search = (query: Record<string, unknown>) => followUpsServices.searchFollowUps(followUpSearchQuerySchema.parse(query));

  afterAll(async () => {
    const personIds = (await database.select({ id: people.id }).from(people).where(like(people.fullName, `%${suffix}%`))).map((row) => row.id);
    const organizationIds = (await database.select({ id: organizations.id }).from(organizations).where(like(organizations.name, `%${suffix}%`))).map((row) => row.id);
    const prospectIds = (await database.select({ id: prospects.id }).from(prospects).innerJoin(routes, eq(routes.id, prospects.routeId)).where(like(routes.name, `%${suffix}%`))).map((row) => row.id);

    if (prospectIds.length > 0) {
      await database.delete(followUps).where(inArray(followUps.prospectId, prospectIds));
      await database.delete(interactions).where(inArray(interactions.prospectId, prospectIds));
      await database.delete(outreachMessages).where(inArray(outreachMessages.prospectId, prospectIds));
      await database.delete(prospects).where(inArray(prospects.id, prospectIds));
    }
    if (personIds.length > 0) {
      await database.delete(personEmails).where(inArray(personEmails.personId, personIds));
      await database.delete(people).where(inArray(people.id, personIds));
    }
    if (organizationIds.length > 0) await database.delete(organizations).where(inArray(organizations.id, organizationIds));
    await database.delete(routeModules).where(like(routeModules.name, `%${suffix}%`));
    await database.delete(routes).where(like(routes.name, `%${suffix}%`));
    await database.delete(auditEvents).where(eq(auditEvents.requestId, actor.requestId));
  });

  describe("creating", () => {
    it("stores the follow-up with its dates and channel, returns it with its context, and audits it without the reason", async () => {
      const seeded = await seedProspect("Create");
      const dueAt = inDays(10);
      const { followUpId, created } = await create(seeded.prospectId, { dueAt, notBeforeAt: inDays(3), suggestedChannel: "linkedin" });

      expect(created).toBe(true);
      expect(await followUpsServices.getFollowUp(followUpId)).toMatchObject({ status: "active", reason: name("Ask about budget"), dueAt: new Date(dueAt).toISOString(), suggestedChannel: "linkedin", prospect: { id: seeded.prospectId, status: "ready", routeName: name("Route Create") }, person: { id: seeded.personId } });
      const audit = await database.select({ action: auditEvents.action, metadata: auditEvents.metadata }).from(auditEvents).where(eq(auditEvents.entityId, followUpId));
      expect(audit).toEqual([{ action: "follow_up.created", metadata: expect.objectContaining({ prospectId: seeded.prospectId }) }]);
      expect(JSON.stringify(audit)).not.toContain("Ask about budget");
    });

    it("returns the open follow-up with the same reason, ignoring case, but adds one for a different reason", async () => {
      const seeded = await seedProspect("Same reason");
      const first = await create(seeded.prospectId);
      const again = await create(seeded.prospectId, { reason: name("ASK ABOUT BUDGET") });
      const other = await create(seeded.prospectId, { reason: name("Something else") });

      expect(again).toMatchObject({ followUpId: first.followUpId, created: false, auditEventId: null });
      expect(other.created).toBe(true);
      expect((await search({ prospectId: seeded.prospectId })).items).toHaveLength(2);
    });

    it("allows the same reason again once the first is finished", async () => {
      const seeded = await seedProspect("After finishing");
      const first = await create(seeded.prospectId);
      await followUpsServices.completeFollowUp(actor, { followUpId: first.followUpId });

      expect((await create(seeded.prospectId)).created).toBe(true);
    });

    it("refuses a do-not-contact person, a closed prospect and an archived person, and ties an origin to its own prospect only", async () => {
      const flagged = await seedProspect("Flagged");
      await peopleServices.markPersonDoNotContact(actor, { personId: flagged.personId, reason: "Asked to stop" });
      await expect(create(flagged.prospectId)).rejects.toMatchObject({ reason: "person_do_not_contact" });

      const closed = await seedProspect("Closed");
      await prospectsServices.updateProspectStatus(actor, { prospectId: closed.prospectId, status: "lost" });
      await expect(create(closed.prospectId)).rejects.toMatchObject({ reason: "prospect_closed" });

      const archived = await seedProspect("Archived");
      await peopleServices.archivePerson(actor, { personId: archived.personId });
      await expect(create(archived.prospectId)).rejects.toMatchObject({ reason: "contact_archived" });

      const mine = await seedProspect("Origin mine");
      const theirs = await seedProspect("Origin theirs");
      const message = await outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId: theirs.prospectId, channel: "email", body: name("Hello") }));
      await expect(create(mine.prospectId, { originOutreachMessageId: message.messageId })).rejects.toMatchObject({ reason: "outreach_message_not_found" });
      await expect(create(theirs.prospectId, { originOutreachMessageId: message.messageId })).resolves.toMatchObject({ created: true });

      const interaction = await interactionsServices.logInteraction(actor, logInteractionInputSchema.parse({ prospectId: theirs.prospectId, direction: "inbound", channel: "email", type: "reply", body: name("Yes") }));
      await expect(create(mine.prospectId, { reason: name("Other"), originInteractionId: interaction.interactionId })).rejects.toMatchObject({ reason: "interaction_not_found" });
    });
  });

  describe("changing", () => {
    it("updates only what differs, clears a date, and refuses dates out of order against the stored one", async () => {
      const seeded = await seedProspect("Update");
      const { followUpId } = await create(seeded.prospectId, { dueAt: inDays(10) });

      await expect(followUpsServices.updateFollowUp(actor, { followUpId, reason: name("New reason"), suggestedChannel: "email" })).resolves.toMatchObject({ changed: true });
      expect(await stored(followUpId)).toMatchObject({ reason: name("New reason"), suggestedChannel: "email" });
      await expect(followUpsServices.updateFollowUp(actor, { followUpId, reason: name("New reason") })).resolves.toMatchObject({ changed: false, auditEventId: null });

      await expect(followUpsServices.updateFollowUp(actor, { followUpId, notBeforeAt: new Date(inDays(20)) })).rejects.toMatchObject({ reason: "follow_up_dates_invalid" });
      await followUpsServices.updateFollowUp(actor, { followUpId, dueAt: null });
      expect((await stored(followUpId))?.dueAt).toBeNull();
    });

    it("completes: clears the due date (the database demands it), stamps the time, and is a no-op when repeated", async () => {
      const seeded = await seedProspect("Complete");
      const { followUpId } = await create(seeded.prospectId, { dueAt: inDays(2) });

      await expect(followUpsServices.completeFollowUp(actor, { followUpId })).resolves.toMatchObject({ status: "completed", changed: true });
      expect(await stored(followUpId)).toMatchObject({ status: "completed", dueAt: null, completedAt: expect.any(Date) });
      await expect(followUpsServices.completeFollowUp(actor, { followUpId })).resolves.toMatchObject({ changed: false, auditEventId: null });
      await expect(followUpsServices.dismissFollowUp(actor, { followUpId, reason: "x" })).rejects.toMatchObject({ reason: "follow_up_finished" });
      await expect(followUpsServices.updateFollowUp(actor, { followUpId, reason: name("Late edit") })).rejects.toMatchObject({ reason: "follow_up_finished" });
    });

    it("dismisses with the reason kept, and refuses to complete it afterwards", async () => {
      const seeded = await seedProspect("Dismiss");
      const { followUpId } = await create(seeded.prospectId, { dueAt: inDays(2) });

      await followUpsServices.dismissFollowUp(actor, { followUpId, reason: "Went with another vendor" });
      expect(await stored(followUpId)).toMatchObject({ status: "dismissed", dueAt: null, completedAt: null, dismissedReason: "Went with another vendor" });
      await expect(followUpsServices.completeFollowUp(actor, { followUpId })).rejects.toMatchObject({ reason: "follow_up_finished" });
    });
  });

  describe("reading", () => {
    it("lists active follow-ups soonest first with undated last, and buckets them without a timezone", async () => {
      const seeded = await seedProspect("Buckets");
      const ids = {
        overdue: (await create(seeded.prospectId, { reason: name("Overdue"), dueAt: inDays(-2) })).followUpId,
        soon: (await create(seeded.prospectId, { reason: name("Soon"), dueAt: inDays(3) })).followUpId,
        later: (await create(seeded.prospectId, { reason: name("Later"), dueAt: inDays(30) })).followUpId,
        undated: (await create(seeded.prospectId, { reason: name("Undated") })).followUpId
      };

      expect((await search({ prospectId: seeded.prospectId })).items.map((item) => item.id)).toEqual([ids.overdue, ids.soon, ids.later, ids.undated]);
      for (const [bucket, id] of [["overdue", ids.overdue], ["next_7_days", ids.soon], ["later", ids.later], ["no_date", ids.undated]] as const) {
        expect((await search({ prospectId: seeded.prospectId, due: bucket })).items.map((item) => item.id)).toEqual([id]);
      }
    });

    it("pages without skipping or repeating, counting once", async () => {
      const seeded = await seedProspect("Paging");
      const created: string[] = [];
      for (const index of [1, 2, 3, 4, 5]) created.push((await create(seeded.prospectId, { reason: name(`Page ${index}`), dueAt: inDays(index) })).followUpId);

      const seen: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const page = await search({ prospectId: seeded.prospectId, limit: 2, ...(cursor ? { cursor } : {}) });
        if (pages === 0) expect(page.total).toBe(5);
        else expect(page.total).toBeNull();
        seen.push(...page.items.map((item) => item.id));
        cursor = page.nextCursor ?? undefined;
        pages += 1;
      } while (cursor);

      expect(seen).toEqual(created);
      expect(pages).toBe(3);
    });

    it("keeps finished follow-ups out of the active list and lists them by status, most recent first", async () => {
      const seeded = await seedProspect("Finished");
      const done = await create(seeded.prospectId, { reason: name("Done") });
      await create(seeded.prospectId, { reason: name("Open") });
      await followUpsServices.completeFollowUp(actor, { followUpId: done.followUpId });

      expect((await search({ prospectId: seeded.prospectId })).items.map((item) => item.reason)).toEqual([name("Open")]);
      expect((await search({ prospectId: seeded.prospectId, status: "completed", sort: "recent" })).items.map((item) => item.id)).toEqual([done.followUpId]);
    });

    it("summarizes every active follow-up by bucket, and returns null for an unknown id", async () => {
      const before = await followUpsServices.getFollowUpSummary();
      const seeded = await seedProspect("Summary");
      await create(seeded.prospectId, { reason: name("A"), dueAt: inDays(-1) });
      await create(seeded.prospectId, { reason: name("B"), dueAt: inDays(2) });
      await create(seeded.prospectId, { reason: name("C"), dueAt: inDays(40) });
      await create(seeded.prospectId, { reason: name("D") });

      const after = await followUpsServices.getFollowUpSummary();
      expect(after).toEqual({ overdue: before.overdue + 1, next7Days: before.next7Days + 1, later: before.later + 1, noDate: before.noDate + 1 });
      expect(await followUpsServices.getFollowUp(uuidv7())).toBeNull();
    });
  });
});
