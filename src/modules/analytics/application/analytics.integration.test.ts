// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { createAnalyticsServices } from "@/modules/analytics/application/create-analytics-services";
import { createInteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import { logBounceInputSchema, logInteractionInputSchema } from "@/modules/interactions/domain/interaction.schema";
import { createOrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { createOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { createOutreachServices } from "@/modules/outreach/application/create-outreach-services";
import { logOutreachInputSchema } from "@/modules/outreach/domain/outreach.schema";
import { createPeopleServices } from "@/modules/people/application/create-people-services";
import { createPersonInputSchema } from "@/modules/people/domain/person.schema";
import { createProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { createProspectInputSchema } from "@/modules/prospects/domain/prospect.schema";
import { createRoutesServices } from "@/modules/routes/application/create-routes-services";
import { createRouteInputSchema, createRouteModuleInputSchema } from "@/modules/routes/domain/route.schema";
import { auditEvents, organizations, people, personEmails, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";
import { createActor } from "@/test/factories/actors";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);
const dayMs = 86_400_000;

describe.skipIf(!testDatabaseUrl)("Overview (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const actor = createActor({ id: `client-${suffix}`, requestId: `request-${suffix}`, source: `analytics-test-${suffix}` });
  const analytics = createAnalyticsServices({ database });
  const outreach = createOutreachServices({ database });
  const interactionsServices = createInteractionsServices({ database });
  const name = (label: string) => `${label} ${suffix}`;

  afterAll(async () => {
    const personIds = (await database.select({ id: people.id }).from(people).where(like(people.fullName, `%${suffix}%`))).map((row) => row.id);
    const organizationIds = (await database.select({ id: organizations.id }).from(organizations).where(like(organizations.name, `%${suffix}%`))).map((row) => row.id);
    const prospectIds = (await database.select({ id: prospects.id }).from(prospects).innerJoin(routes, eq(routes.id, prospects.routeId)).where(like(routes.name, `%${suffix}%`))).map((row) => row.id);

    if (prospectIds.length > 0) {
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

  it("counts what was sent, who replied, how deep, and who is still waiting, compared with the figures before", async () => {
    const before = await analytics.getOverview({ range: "7d" });

    const route = await createRoutesServices({ database }).createRoute(actor, createRouteInputSchema.parse({ name: name("Overview route") }));
    const seedProspect = async (label: string) => {
      const person = await createPeopleServices({ database }).createPerson(actor, createPersonInputSchema.parse({ fullName: name(label) }));
      const organization = await createOrganizationsServices({ database }).createOrganization(actor, createOrganizationInputSchema.parse({ name: name(`Org ${label}`) }));
      return createProspectsServices({ database }).createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, organizationId: organization.organizationId, routeId: route.routeId, status: "ready" }));
    };
    const answered = await seedProspect("Answered");
    const waiting = await seedProspect("Waiting");
    const daysAgo = (days: number) => new Date(Date.now() - days * dayMs).toISOString();
    const send = (prospectId: string, sentAt: string) => outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId, channel: "linkedin", body: name("Hello"), sentAt }));

    const first = await send(answered.prospectId, daysAgo(5));
    await send(waiting.prospectId, daysAgo(4));
    await interactionsServices.logInteraction(actor, logInteractionInputSchema.parse({ prospectId: answered.prospectId, outreachMessageId: first.messageId, direction: "inbound", channel: "linkedin", type: "reply", body: name("Yes"), responseDepth: 3, occurredAt: daysAgo(2) }));

    const after = await analytics.getOverview({ range: "7d" });
    const delta = (read: (overview: typeof after) => number) => read(after) - read(before);

    expect(delta((overview) => overview.totals.sent.current)).toBe(2);
    expect(delta((overview) => overview.totals.reached.current)).toBe(2);
    expect(delta((overview) => overview.totals.replies.current)).toBe(1);
    expect(delta((overview) => overview.totals.replyRate.current.part)).toBe(1);
    expect(delta((overview) => overview.totals.replyRate.current.whole)).toBe(2);
    expect(delta((overview) => overview.channels.find((channel) => channel.channel === "linkedin")?.sent ?? 0)).toBe(2);
    expect(delta((overview) => overview.channels.find((channel) => channel.channel === "linkedin")?.replied ?? 0)).toBe(1);
    expect(delta((overview) => overview.depth[2]?.prospects ?? 0)).toBe(1);
    expect(delta((overview) => overview.pipeline.find((stage) => stage.status === "contacted")?.prospects ?? 0)).toBe(1);
    expect(delta((overview) => overview.pipeline.find((stage) => stage.status === "replied")?.prospects ?? 0)).toBe(1);
    expect(delta((overview) => overview.awaitingReply.total)).toBe(1);
    expect(delta((overview) => overview.calendar.reduce((total, day) => total + day.sent, 0))).toBe(2);
    expect(after.routes.find((item) => item.id === route.routeId)?.stats).toMatchObject({ prospects: 2, messages: 2, replies: 1 });
  });

  it("returns a full, ordered shape even for a window with nothing in it", async () => {
    const overview = await analytics.getOverview({ range: "90d" });

    expect(overview.activity).toHaveLength(90);
    expect(overview.calendar).toHaveLength(182);
    expect(overview.pipeline).toHaveLength(11);
    expect(overview.depth).toHaveLength(9);
    expect(overview.channels).toHaveLength(4);
  });
  describe("analytics", () => {
    const daysAgo = (days: number, hours = 0) => new Date(Date.now() - days * dayMs + hours * 3_600_000).toISOString();

    it("splits results by route, module, channel and persona, funnels the cohort, and times the first reply", async () => {
      const beforeInsights = await analytics.getInsights({ range: "30d" });
      const beforeChannels = await analytics.getBreakdown({ range: "30d", by: "channel", limit: 10 });
      const beforePersonas = await analytics.getBreakdown({ range: "30d", by: "persona", limit: 50 });
      const rowOf = (rows: readonly { key: string | null; sent: number }[], key: string) => rows.find((row) => row.key === key)?.sent ?? 0;

      const routesServices = createRoutesServices({ database });
      const route = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name("Analytics route") }));
      const routeModule = await routesServices.createRouteModule(actor, createRouteModuleInputSchema.parse({ routeId: route.routeId, name: name("Analytics module") }));
      const seed = async (label: string, persona: string) => {
        const person = await createPeopleServices({ database }).createPerson(actor, createPersonInputSchema.parse({ fullName: name(label), persona }));
        const organization = await createOrganizationsServices({ database }).createOrganization(actor, createOrganizationInputSchema.parse({ name: name(`Org ${label}`) }));
        return createProspectsServices({ database }).createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, organizationId: organization.organizationId, routeId: route.routeId, routeModuleId: routeModule.routeModuleId, status: "ready" }));
      };
      const send = (prospectId: string, channel: "email" | "linkedin", sentAt: string) => outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId, channel, body: name(`Hello ${channel}`), sentAt }));

      const answered = await seed("Answered", "recruiter");
      const bounced = await seed("Bounced", "recruiter");
      const first = await send(answered.prospectId, "email", daysAgo(5));
      const second = await send(bounced.prospectId, "email", daysAgo(4));
      await send(answered.prospectId, "linkedin", daysAgo(1));
      await interactionsServices.logInteraction(actor, logInteractionInputSchema.parse({ prospectId: answered.prospectId, outreachMessageId: first.messageId, direction: "inbound", channel: "email", type: "reply", body: name("Yes"), responseDepth: 3, occurredAt: daysAgo(5, 2) }));
      await interactionsServices.logBounce(actor, logBounceInputSchema.parse({ outreachMessageId: second.messageId, bounceStatus: "hard" }));

      const [routeBreakdown, moduleBreakdown, channels, personas, after] = await Promise.all([
        analytics.getBreakdown({ range: "30d", by: "route", limit: 50 }),
        analytics.getBreakdown({ range: "30d", by: "module", limit: 50 }),
        analytics.getBreakdown({ range: "30d", by: "channel", limit: 10 }),
        analytics.getBreakdown({ range: "30d", by: "persona", limit: 50 }),
        analytics.getInsights({ range: "30d" })
      ]);

      // The route is unique to this test, so its numbers are exact.
      expect(routeBreakdown.rows.find((row) => row.key === route.routeId)).toMatchObject({ name: name("Analytics route"), sent: 3, reached: 2, repliedProspects: 1, repliedMessages: 1, bounced: 1 });
      expect(moduleBreakdown.rows.find((row) => row.key === routeModule.routeModuleId)).toMatchObject({ name: `${name("Analytics route")} / ${name("Analytics module")}`, sent: 3 });
      expect(rowOf(channels.rows, "email") - rowOf(beforeChannels.rows, "email")).toBe(2);
      expect(rowOf(channels.rows, "linkedin") - rowOf(beforeChannels.rows, "linkedin")).toBe(1);
      expect(rowOf(personas.rows, "recruiter") - rowOf(beforePersonas.rows, "recruiter")).toBe(3);

      const delta = (read: (insights: typeof after) => number) => read(after) - read(beforeInsights);
      expect(delta((insights) => insights.totals.sent.current)).toBe(3);
      expect(delta((insights) => insights.totals.reached.current)).toBe(2);
      expect(delta((insights) => insights.totals.replyRate.current.part)).toBe(1);
      expect(delta((insights) => insights.totals.bounceRate.current.part)).toBe(1);
      expect(delta((insights) => insights.totals.bounceRate.current.whole)).toBe(2);
      expect(delta((insights) => insights.funnel.steps[0]?.prospects ?? 0)).toBe(2);
      expect(delta((insights) => insights.funnel.steps[1]?.prospects ?? 0)).toBe(1);
      expect(delta((insights) => insights.funnel.steps[2]?.prospects ?? 0)).toBe(1);
      expect(delta((insights) => insights.funnel.steps[3]?.prospects ?? 0)).toBe(0);
      expect(delta((insights) => insights.responseTime.sample)).toBe(1);
      expect(delta((insights) => insights.responseTime.buckets.find((band) => band.bucket === "day")?.replies ?? 0)).toBe(1);
      expect(delta((insights) => insights.sendTimes.reduce((total, cell) => total + cell.sent, 0))).toBe(3);
      expect(delta((insights) => insights.deliverability.bounces.hard)).toBe(1);
      expect(delta((insights) => insights.trend.reduce((total, point) => total + point.sent, 0))).toBe(3);
    });

    it("returns a weekly trend for a long window, and a bounded, ordered list", async () => {
      const year = await analytics.getInsights({ range: "365d" });
      expect(year.granularity).toBe("week");
      expect(year.trend.length).toBeGreaterThanOrEqual(52);
      expect(year.trend.every((point, index, points) => index === 0 || (points[index - 1]?.date ?? "") < point.date)).toBe(true);

      const limited = await analytics.getBreakdown({ range: "365d", by: "route", limit: 1 });
      expect(limited.rows.length).toBeLessThanOrEqual(1);
      const sorted = (await analytics.getBreakdown({ range: "365d", by: "country", limit: 50 })).rows;
      expect(sorted.every((row, index) => index === 0 || (sorted[index - 1]?.sent ?? 0) >= row.sent)).toBe(true);
    });
  });
});
