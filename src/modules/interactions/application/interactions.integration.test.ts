// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
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
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";
import { idempotencyKeys } from "@/shared/db/schema/integration";
import { createActor } from "@/test/factories/actors";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("Interactions (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const actor = createActor({ id: `client-${suffix}`, requestId: `request-${suffix}`, source: `interactions-test-${suffix}` });
  const interactionsServices = createInteractionsServices({ database });
  const outreach = createOutreachServices({ database });
  const peopleServices = createPeopleServices({ database });
  const organizationsServices = createOrganizationsServices({ database });
  const prospectsServices = createProspectsServices({ database });
  const routesServices = createRoutesServices({ database });
  const name = (label: string) => `${label} ${suffix}`;

  /** A contacted prospect with one email already sent, which is where most interactions begin. */
  async function seedConversation(label: string) {
    const route = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name(`Route ${label}`) }));
    const person = await peopleServices.createPerson(actor, createPersonInputSchema.parse({ fullName: name(label) }));
    const organization = await organizationsServices.createOrganization(actor, createOrganizationInputSchema.parse({ name: name(`Org ${label}`) }));
    const prospect = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, organizationId: organization.organizationId, routeId: route.routeId, status: "ready" }));
    const sentAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const message = await outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId: prospect.prospectId, channel: "email", body: name("First email"), sentAt: sentAt.toISOString() }));
    return { prospectId: prospect.prospectId, personId: person.personId, messageId: message.messageId, sentAt };
  }
  const log = (input: Record<string, unknown>) => interactionsServices.logInteraction(actor, logInteractionInputSchema.parse({ direction: "inbound", channel: "email", type: "reply", body: name("Their words"), ...input }));
  const stored = async (messageId: string) => (await database.select({ replyStatus: outreachMessages.replyStatus, bounceStatus: outreachMessages.bounceStatus, deliveryStatus: outreachMessages.deliveryStatus }).from(outreachMessages).where(eq(outreachMessages.id, messageId)))[0];

  afterAll(async () => {
    const personIds = (await database.select({ id: people.id }).from(people).where(like(people.fullName, `%${suffix}%`))).map((row) => row.id);
    const organizationIds = (await database.select({ id: organizations.id }).from(organizations).where(like(organizations.name, `%${suffix}%`))).map((row) => row.id);
    const prospectIds = (await database.select({ id: prospects.id }).from(prospects).innerJoin(routes, eq(routes.id, prospects.routeId)).where(like(routes.name, `%${suffix}%`))).map((row) => row.id);

    if (prospectIds.length > 0) {
      await database.delete(interactions).where(inArray(interactions.prospectId, prospectIds));
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

  describe("replies", () => {
    it("records their reply and, in the same commit, marks the message and moves the prospect, without counting as our contact", async () => {
      const seeded = await seedConversation("Reply");
      const result = await log({ prospectId: seeded.prospectId, outreachMessageId: seeded.messageId, responseDepth: 4, sentiment: "positive" });

      expect(result).toMatchObject({ created: true, prospectStatus: "replied", messageReplyStatus: "replied" });
      expect(await stored(seeded.messageId)).toMatchObject({ replyStatus: "replied" });
      const prospect = await prospectsServices.getProspect(seeded.prospectId);
      expect(prospect).toMatchObject({ status: "replied", lastContactedAt: seeded.sentAt.toISOString() });
      expect((await peopleServices.getPerson(seeded.personId))?.lastContactedAt).toBe(seeded.sentAt.toISOString());

      const [row] = await database.select().from(interactions).where(eq(interactions.id, result.interactionId));
      expect(row).toMatchObject({ prospectId: seeded.prospectId, outreachMessageId: seeded.messageId, direction: "inbound", type: "reply", responseDepth: 4, sentiment: "positive" });
      const audit = await database.select({ action: auditEvents.action, metadata: auditEvents.metadata }).from(auditEvents).where(eq(auditEvents.entityId, result.interactionId));
      expect(audit).toEqual([{ action: "interaction.logged", metadata: expect.objectContaining({ statusChange: { from: "contacted", to: "replied" } }) }]);
      expect(JSON.stringify(audit)).not.toContain(name("Their words"));
    });

    it("lets a real reply upgrade an auto-reply, and never the other way round", async () => {
      const seeded = await seedConversation("Auto reply");
      const auto = await log({ prospectId: seeded.prospectId, outreachMessageId: seeded.messageId, type: "auto_reply", body: name("Out of office") });

      expect(auto).toMatchObject({ prospectStatus: "contacted", messageReplyStatus: "auto_reply" });
      await log({ prospectId: seeded.prospectId, outreachMessageId: seeded.messageId });
      expect(await stored(seeded.messageId)).toMatchObject({ replyStatus: "replied" });
      await log({ prospectId: seeded.prospectId, outreachMessageId: seeded.messageId, type: "auto_reply", body: name("Out of office again") });
      expect(await stored(seeded.messageId)).toMatchObject({ replyStatus: "replied" });
    });

    it("refuses a message that belongs to another prospect", async () => {
      const first = await seedConversation("Mine");
      const other = await seedConversation("Theirs");

      await expect(log({ prospectId: first.prospectId, outreachMessageId: other.messageId })).rejects.toMatchObject({ reason: "outreach_message_not_found" });
    });
  });

  describe("what we send", () => {
    it("counts as contact for the prospect and the person", async () => {
      const seeded = await seedConversation("Follow up");
      const occurredAt = new Date(Date.now() - 60 * 60 * 1000);
      await log({ prospectId: seeded.prospectId, type: "follow_up_message", direction: "outbound", body: name("Nudge"), occurredAt: occurredAt.toISOString() });

      expect((await prospectsServices.getProspect(seeded.prospectId))?.lastContactedAt).toBe(occurredAt.toISOString());
      expect((await peopleServices.getPerson(seeded.personId))?.lastContactedAt).toBe(occurredAt.toISOString());
    });

    it("is refused for a do-not-contact person, while what they sent is still recorded", async () => {
      const seeded = await seedConversation("Flagged");
      await peopleServices.markPersonDoNotContact(actor, { personId: seeded.personId, reason: "Asked to stop" });

      await expect(log({ prospectId: seeded.prospectId, type: "follow_up_message", direction: "outbound", body: name("Nudge") })).rejects.toMatchObject({ reason: "person_do_not_contact" });
      await expect(log({ prospectId: seeded.prospectId, body: name("Please stop") })).resolves.toMatchObject({ created: true });
    });
  });

  describe("bounces", () => {
    it("sets the message's bounce, fails its delivery, keeps it in the timeline, and is a no-op when repeated", async () => {
      const seeded = await seedConversation("Bounce");
      const first = await interactionsServices.logBounce(actor, { outreachMessageId: seeded.messageId, bounceStatus: "hard" });

      expect(first).toMatchObject({ changed: true, bounceStatus: "hard" });
      expect(await stored(seeded.messageId)).toEqual({ replyStatus: "none", bounceStatus: "hard", deliveryStatus: "failed" });
      const timeline = await interactionsServices.listInteractions({ prospectId: seeded.prospectId, limit: 25 });
      expect(timeline).toEqual([expect.objectContaining({ type: "bounce_notice", direction: "inbound", channel: "email", outreachMessageId: seeded.messageId })]);

      await expect(interactionsServices.logBounce(actor, { outreachMessageId: seeded.messageId, bounceStatus: "hard" })).resolves.toMatchObject({ changed: false, auditEventId: null });
      expect(await interactionsServices.listInteractions({ prospectId: seeded.prospectId, limit: 25 })).toHaveLength(1);
    });

    it("reports an unknown message", async () => {
      await expect(interactionsServices.logBounce(actor, { outreachMessageId: uuidv7(), bounceStatus: "soft" })).rejects.toMatchObject({ code: "not_found" });
    });
  });

  describe("idempotency", () => {
    it("returns the first interaction for a repeated key, and refuses the key for different content", async () => {
      const seeded = await seedConversation("Idempotent");
      const key = `key-${suffix}-i`;
      const first = await log({ prospectId: seeded.prospectId, idempotencyKey: key });
      const again = await log({ prospectId: seeded.prospectId, idempotencyKey: key });

      expect(again).toMatchObject({ interactionId: first.interactionId, created: false, auditEventId: null });
      expect(await database.select({ id: interactions.id }).from(interactions).where(eq(interactions.prospectId, seeded.prospectId))).toHaveLength(1);
      await expect(log({ prospectId: seeded.prospectId, idempotencyKey: key, body: name("Different") })).rejects.toMatchObject({ reason: "idempotency_key_reused" });
    });

    it("treats the same content moments ago as a double submit, but a different type as new", async () => {
      const seeded = await seedConversation("Double");
      const first = await log({ prospectId: seeded.prospectId });
      const second = await log({ prospectId: seeded.prospectId });
      const other = await log({ prospectId: seeded.prospectId, type: "auto_reply" });

      expect(second).toMatchObject({ interactionId: first.interactionId, created: false });
      expect(other.created).toBe(true);
    });
  });

  it("lists a prospect's timeline newest first and bounded", async () => {
    const seeded = await seedConversation("Timeline");
    const base = Date.now() - 24 * 60 * 60 * 1000;
    const ids: string[] = [];
    for (const index of [0, 1, 2]) ids.push((await log({ prospectId: seeded.prospectId, type: "call", direction: "outbound", body: name(`Call ${index}`), occurredAt: new Date(base + index * 60_000).toISOString() })).interactionId);

    expect((await interactionsServices.listInteractions({ prospectId: seeded.prospectId, limit: 25 })).map((item) => item.id)).toEqual([...ids].reverse());
    expect(await interactionsServices.listInteractions({ prospectId: seeded.prospectId, limit: 2 })).toHaveLength(2);
    expect(await interactionsServices.listInteractions({ prospectId: uuidv7(), limit: 25 })).toEqual([]);
  });
});
