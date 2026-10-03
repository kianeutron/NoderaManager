// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { createCampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import { campaignMembersQuerySchema, campaignSearchQuerySchema, campaignSuggestionsQuerySchema, createCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";
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
import { createRouteInputSchema, createRouteModuleInputSchema } from "@/modules/routes/domain/route.schema";
import { auditEvents, organizations, people, personEmails, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { interactions, outreachMessages } from "@/shared/db/schema/engagement";
import { campaignProspects, campaignRoutes, campaigns } from "@/shared/db/schema/strategy";
import { createActor } from "@/test/factories/actors";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("Routes and campaigns (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const actor = createActor({ id: `client-${suffix}`, requestId: `request-${suffix}`, source: `campaigns-test-${suffix}` });
  const campaignsServices = createCampaignsServices({ database });
  const routesServices = createRoutesServices({ database });
  const outreach = createOutreachServices({ database });
  const interactionsServices = createInteractionsServices({ database });
  const peopleServices = createPeopleServices({ database });
  const organizationsServices = createOrganizationsServices({ database });
  const prospectsServices = createProspectsServices({ database });
  const name = (label: string) => `${label} ${suffix}`;

  const seedRoute = async (label: string) => {
    const route = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name(label) }));
    const routeModule = await routesServices.createRouteModule(actor, createRouteModuleInputSchema.parse({ routeId: route.routeId, name: name(`${label} module`) }));
    return { routeId: route.routeId, moduleId: routeModule.routeModuleId };
  };
  const seedProspect = async (label: string, route: { routeId: string; moduleId?: string }, options: { persona?: string; countryCode?: string; status?: "researched" | "ready"; withModule?: boolean } = {}) => {
    const person = await peopleServices.createPerson(actor, createPersonInputSchema.parse({ fullName: name(label), ...(options.persona ? { persona: options.persona } : {}), ...(options.countryCode ? { countryCode: options.countryCode } : {}) }));
    const organization = await organizationsServices.createOrganization(actor, createOrganizationInputSchema.parse({ name: name(`Org ${label}`) }));
    const prospect = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, organizationId: organization.organizationId, routeId: route.routeId, ...(options.withModule && route.moduleId ? { routeModuleId: route.moduleId } : {}), status: options.status ?? "ready" }));
    return { prospectId: prospect.prospectId, personId: person.personId };
  };
  const create = (label: string, extra: Record<string, unknown> = {}) => campaignsServices.createCampaign(actor, createCampaignInputSchema.parse({ name: name(label), ...extra }));
  const start = (campaignId: string) => campaignsServices.setCampaignStatus(actor, { campaignId, status: "active" });
  const page = (query: Record<string, unknown>) => campaignsServices.searchCampaigns(campaignSearchQuerySchema.parse(query));
  const suggest = (campaignId: string, query: Record<string, unknown> = {}) => campaignsServices.suggestCampaignProspects(campaignId, campaignSuggestionsQuerySchema.parse(query));

  afterAll(async () => {
    const personIds = (await database.select({ id: people.id }).from(people).where(like(people.fullName, `%${suffix}%`))).map((row) => row.id);
    const organizationIds = (await database.select({ id: organizations.id }).from(organizations).where(like(organizations.name, `%${suffix}%`))).map((row) => row.id);
    const campaignIds = (await database.select({ id: campaigns.id }).from(campaigns).where(like(campaigns.name, `%${suffix}%`))).map((row) => row.id);
    const prospectIds = (await database.select({ id: prospects.id }).from(prospects).innerJoin(routes, eq(routes.id, prospects.routeId)).where(like(routes.name, `%${suffix}%`))).map((row) => row.id);

    if (prospectIds.length > 0) {
      await database.delete(interactions).where(inArray(interactions.prospectId, prospectIds));
      await database.delete(outreachMessages).where(inArray(outreachMessages.prospectId, prospectIds));
    }
    if (campaignIds.length > 0) {
      await database.delete(campaignProspects).where(inArray(campaignProspects.campaignId, campaignIds));
      await database.delete(campaignRoutes).where(inArray(campaignRoutes.campaignId, campaignIds));
      await database.delete(campaigns).where(inArray(campaigns.id, campaignIds));
    }
    if (prospectIds.length > 0) await database.delete(prospects).where(inArray(prospects.id, prospectIds));
    if (personIds.length > 0) {
      await database.delete(personEmails).where(inArray(personEmails.personId, personIds));
      await database.delete(people).where(inArray(people.id, personIds));
    }
    if (organizationIds.length > 0) await database.delete(organizations).where(inArray(organizations.id, organizationIds));
    await database.delete(routeModules).where(like(routeModules.name, `%${suffix}%`));
    await database.delete(routes).where(like(routes.name, `%${suffix}%`));
    await database.delete(auditEvents).where(eq(auditEvents.requestId, actor.requestId));
  });

  describe("routes", () => {
    it("renames, re-orders and describes a route, refuses a taken name, and lets a route recase its own", async () => {
      const first = await seedRoute("Edit route");
      const other = await seedRoute("Other route");

      await expect(routesServices.updateRoute(actor, { routeId: first.routeId, name: name("Renamed route"), description: "Who they are", sortOrder: 4 })).resolves.toMatchObject({ changed: true });
      await expect(routesServices.updateRoute(actor, { routeId: first.routeId, sortOrder: 4 })).resolves.toMatchObject({ changed: false, auditEventId: null });
      await expect(routesServices.updateRoute(actor, { routeId: first.routeId, name: name("Other route") })).rejects.toMatchObject({ reason: "route_name_taken" });
      await expect(routesServices.updateRoute(actor, { routeId: other.routeId, name: name("OTHER ROUTE") })).resolves.toMatchObject({ changed: true });

      const [overview] = (await routesServices.getRouteOverview({ scope: "active" })).filter((route) => route.id === first.routeId);
      expect(overview).toMatchObject({ name: name("Renamed route"), description: "Who they are", sortOrder: 4 });
    });

    it("updates a module and refuses a name another module of the same route has", async () => {
      const seeded = await seedRoute("Module edit");
      const second = await routesServices.createRouteModule(actor, createRouteModuleInputSchema.parse({ routeId: seeded.routeId, name: name("Second module") }));

      await expect(routesServices.updateRouteModule(actor, { routeModuleId: second.routeModuleId, name: name("Module edit module") })).rejects.toMatchObject({ reason: "module_name_taken" });
      await expect(routesServices.updateRouteModule(actor, { routeModuleId: second.routeModuleId, description: "A tactic" })).resolves.toMatchObject({ changed: true });
    });

    it("archives and restores a route and a module: hidden from pickers and the active overview, found in the archived one", async () => {
      const seeded = await seedRoute("Archivable");
      const inPickers = async () => (await routesServices.listRoutes()).some((route) => route.id === seeded.routeId);
      const inOverview = async (scope: "active" | "archived") => (await routesServices.getRouteOverview({ scope })).some((route) => route.id === seeded.routeId);

      expect(await inPickers()).toBe(true);
      await routesServices.archiveRoute(actor, { routeId: seeded.routeId });
      expect(await inPickers()).toBe(false);
      expect(await inOverview("active")).toBe(false);
      expect(await inOverview("archived")).toBe(true);
      await expect(routesServices.updateRoute(actor, { routeId: seeded.routeId, sortOrder: 1 })).rejects.toMatchObject({ code: "not_found" });
      await expect(routesServices.archiveRoute(actor, { routeId: seeded.routeId })).resolves.toMatchObject({ changed: false, auditEventId: null });

      await routesServices.restoreRoute(actor, { routeId: seeded.routeId });
      expect(await inPickers()).toBe(true);

      await routesServices.archiveRouteModule(actor, { routeModuleId: seeded.moduleId });
      const route = (await routesServices.listRoutes()).find((candidate) => candidate.id === seeded.routeId);
      expect(route?.modules).toEqual([]);
      const archivedModule = (await routesServices.getRouteOverview({ scope: "active" })).find((candidate) => candidate.id === seeded.routeId)?.modules[0];
      expect(archivedModule).toMatchObject({ id: seeded.moduleId, archivedAt: expect.any(String) });
    });

    it("counts what each route and module has produced, live", async () => {
      const seeded = await seedRoute("Stats");
      const onModule = await seedProspect("Stats module", seeded, { withModule: true });
      const onRoute = await seedProspect("Stats route", seeded);
      await seedProspect("Stats closed", seeded);
      await prospectsServices.updateProspectStatus(actor, { prospectId: (await seedProspect("Stats won", seeded)).prospectId, status: "won" });

      const sent = await outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId: onModule.prospectId, channel: "email", body: name("Hello") }));
      await outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId: onRoute.prospectId, channel: "email", body: name("Hello route") }));
      await interactionsServices.logInteraction(actor, logInteractionInputSchema.parse({ prospectId: onModule.prospectId, outreachMessageId: sent.messageId, direction: "inbound", channel: "email", type: "reply", body: name("Yes") }));

      const route = (await routesServices.getRouteOverview({ scope: "active" })).find((candidate) => candidate.id === seeded.routeId);
      expect(route?.stats).toEqual({ prospects: 4, openProspects: 3, won: 1, messages: 2, replies: 1 });
      expect(route?.modules[0]?.stats).toEqual({ prospects: 1, openProspects: 1, won: 0, messages: 1, replies: 1 });
    });
  });

  describe("campaigns", () => {
    it("creates a draft with routes and rules, reads it back, is idempotent on the name, and refuses an archived name", async () => {
      const seeded = await seedRoute("Create");
      const { campaignId, created } = await create("Q4 agencies", { goal: "Get 5 calls", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z", targetingRules: { personas: ["recruiter"], countries: ["de"] }, routes: [{ routeId: seeded.routeId }, { routeId: seeded.routeId, routeModuleId: seeded.moduleId }] });

      expect(created).toBe(true);
      expect(await campaignsServices.getCampaign(campaignId)).toMatchObject({
        name: name("Q4 agencies"), status: "draft", goal: "Get 5 calls", startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-12-01T00:00:00.000Z",
        targetingRules: { personas: ["recruiter"], countries: ["DE"], organizationTypes: [] },
        routes: [{ routeId: seeded.routeId, routeName: name("Create"), moduleId: null, moduleName: null }, { routeId: seeded.routeId, routeName: name("Create"), moduleId: seeded.moduleId, moduleName: name("Create module") }],
        stats: { members: 0, contacted: 0, won: 0, messages: 0, replies: 0 }
      });
      await expect(create("q4 AGENCIES")).resolves.toMatchObject({ campaignId, created: false, auditEventId: null });

      await campaignsServices.setCampaignStatus(actor, { campaignId, status: "active" });
      await campaignsServices.setCampaignStatus(actor, { campaignId, status: "paused" });
      await campaignsServices.archiveCampaign(actor, { campaignId });
      await expect(create("Q4 agencies")).rejects.toMatchObject({ reason: "campaign_name_taken" });
    });

    it("refuses an archived route or a module of another route when creating", async () => {
      const first = await seedRoute("Bad routes A");
      const second = await seedRoute("Bad routes B");
      await expect(create("Wrong module", { routes: [{ routeId: first.routeId, routeModuleId: second.moduleId }] })).rejects.toMatchObject({ reason: "module_not_in_route" });
      await routesServices.archiveRoute(actor, { routeId: second.routeId });
      await expect(create("Archived route", { routes: [{ routeId: second.routeId }] })).rejects.toMatchObject({ reason: "route_not_found" });
    });

    it("updates fields and rules, refuses a bad window and a taken name, and freezes a completed campaign", async () => {
      const seeded = await seedRoute("Update");
      const { campaignId } = await create("Updatable", { routes: [{ routeId: seeded.routeId }], startsAt: "2026-10-01T00:00:00Z" });
      await create("Other name");

      await expect(campaignsServices.updateCampaign(actor, { campaignId, goal: "New goal", targetingRules: { organizationTypes: ["agency"], personas: [], countries: [] } })).resolves.toMatchObject({ changed: true });
      expect(await campaignsServices.getCampaign(campaignId)).toMatchObject({ goal: "New goal", targetingRules: { organizationTypes: ["agency"] } });
      await expect(campaignsServices.updateCampaign(actor, { campaignId, goal: "New goal" })).resolves.toMatchObject({ changed: false, auditEventId: null });
      await expect(campaignsServices.updateCampaign(actor, { campaignId, endsAt: new Date("2026-09-01T00:00:00Z") })).rejects.toMatchObject({ reason: "campaign_window_invalid" });
      await expect(campaignsServices.updateCampaign(actor, { campaignId, name: name("Other name") })).rejects.toMatchObject({ reason: "campaign_name_taken" });

      await start(campaignId);
      await campaignsServices.setCampaignStatus(actor, { campaignId, status: "completed" });
      await expect(campaignsServices.updateCampaign(actor, { campaignId, goal: "Late edit" })).rejects.toMatchObject({ reason: "campaign_finished" });
      await expect(campaignsServices.setCampaignRoutes(actor, { campaignId, routes: [] })).rejects.toMatchObject({ reason: "campaign_finished" });
    });

    it("follows the lifecycle, needs a route to start, keeps a route while running, and will not archive a running campaign", async () => {
      const seeded = await seedRoute("Lifecycle");
      const { campaignId } = await create("Lifecycle campaign");

      await expect(start(campaignId)).rejects.toMatchObject({ reason: "campaign_needs_route" });
      await expect(campaignsServices.setCampaignStatus(actor, { campaignId, status: "completed" })).rejects.toMatchObject({ reason: "campaign_transition_invalid" });

      await campaignsServices.setCampaignRoutes(actor, { campaignId, routes: [{ routeId: seeded.routeId }] });
      await expect(campaignsServices.setCampaignRoutes(actor, { campaignId, routes: [{ routeId: seeded.routeId }] })).resolves.toMatchObject({ changed: false, auditEventId: null });
      await expect(start(campaignId)).resolves.toMatchObject({ status: "active", previousStatus: "draft", changed: true });
      await expect(start(campaignId)).resolves.toMatchObject({ changed: false });

      await expect(campaignsServices.setCampaignRoutes(actor, { campaignId, routes: [] })).rejects.toMatchObject({ reason: "campaign_needs_route" });
      await expect(campaignsServices.archiveCampaign(actor, { campaignId })).rejects.toMatchObject({ reason: "campaign_running" });

      await campaignsServices.setCampaignStatus(actor, { campaignId, status: "paused" });
      await campaignsServices.setCampaignStatus(actor, { campaignId, status: "active" });
      await campaignsServices.setCampaignStatus(actor, { campaignId, status: "paused" });
      await expect(campaignsServices.archiveCampaign(actor, { campaignId })).resolves.toMatchObject({ archived: true });
      await expect(campaignsServices.restoreCampaign(actor, { campaignId })).resolves.toMatchObject({ archived: false });
    });
  });

  describe("membership", () => {
    it("adds prospects on the campaign's routes, is idempotent, refuses others, lists them paged, and removes only the link", async () => {
      const seeded = await seedRoute("Members");
      const elsewhere = await seedRoute("Members elsewhere");
      const { campaignId } = await create("Members campaign", { routes: [{ routeId: seeded.routeId }] });
      const inside = [await seedProspect("Member one", seeded), await seedProspect("Member two", seeded, { withModule: true }), await seedProspect("Member three", seeded)];
      const outside = await seedProspect("Outsider", elsewhere);

      await expect(campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: inside.map((prospect) => prospect.prospectId) })).resolves.toMatchObject({ changed: 3, unchanged: 0 });
      await expect(campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: [inside[0]?.prospectId as string] })).resolves.toMatchObject({ changed: 0, unchanged: 1, auditEventId: null });
      await expect(campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: [outside.prospectId] })).rejects.toMatchObject({ reason: "prospect_outside_campaign_routes" });
      await expect(campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: [uuidv7()] })).rejects.toMatchObject({ code: "not_found" });

      const seen: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const members = await campaignsServices.listCampaignProspects(campaignId, campaignMembersQuerySchema.parse({ limit: 2, ...(cursor ? { cursor } : {}) }));
        if (pages === 0) expect(members.total).toBe(3);
        else expect(members.total).toBeNull();
        seen.push(...members.items.map((item) => item.prospectId));
        cursor = members.nextCursor ?? undefined;
        pages += 1;
      } while (cursor);
      expect(seen.toSorted()).toEqual(inside.map((prospect) => prospect.prospectId).toSorted());
      expect(pages).toBe(2);

      await expect(campaignsServices.removeCampaignProspects(actor, { campaignId, prospectIds: [inside[0]?.prospectId as string, outside.prospectId] })).resolves.toMatchObject({ changed: 1, unchanged: 1 });
      expect((await campaignsServices.listCampaignProspects(campaignId, campaignMembersQuerySchema.parse({}))).total).toBe(2);
      // Only the link went: the prospect and their person are untouched.
      expect(await prospectsServices.getProspect(inside[0]?.prospectId as string)).toMatchObject({ id: inside[0]?.prospectId });
    });

    it("lets a module-only entry take only that module's prospects", async () => {
      const seeded = await seedRoute("Module only");
      const { campaignId } = await create("Module only campaign", { routes: [{ routeId: seeded.routeId, routeModuleId: seeded.moduleId }] });
      const onModule = await seedProspect("On the module", seeded, { withModule: true });
      const onRoute = await seedProspect("On the route only", seeded);

      await expect(campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: [onRoute.prospectId] })).rejects.toMatchObject({ reason: "prospect_outside_campaign_routes" });
      await expect(campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: [onModule.prospectId] })).resolves.toMatchObject({ changed: 1 });
      expect((await suggest(campaignId)).map((suggestion) => suggestion.prospectId)).not.toContain(onRoute.prospectId);
    });

    it("suggests open, contactable prospects on the campaign's routes, rule matches first, none already in, and narrows by name", async () => {
      const seeded = await seedRoute("Suggest");
      const { campaignId } = await create("Suggest campaign", { routes: [{ routeId: seeded.routeId }], targetingRules: { personas: ["recruiter"] } });
      const fit = await seedProspect("Suggest fit", seeded, { persona: "recruiter" });
      const other = await seedProspect("Suggest other", seeded, { persona: "founder" });
      const member = await seedProspect("Suggest member", seeded, { persona: "recruiter" });
      const flagged = await seedProspect("Suggest flagged", seeded, { persona: "recruiter" });
      const closed = await seedProspect("Suggest closed", seeded, { persona: "recruiter" });
      await campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: [member.prospectId] });
      await peopleServices.markPersonDoNotContact(actor, { personId: flagged.personId, reason: "Asked to stop" });
      await prospectsServices.updateProspectStatus(actor, { prospectId: closed.prospectId, status: "lost" });

      const suggestions = await suggest(campaignId);
      expect(suggestions.map((suggestion) => [suggestion.prospectId, suggestion.matchesRules])).toEqual([[fit.prospectId, true], [other.prospectId, false]]);
      expect((await suggest(campaignId, { q: "suggest other" })).map((suggestion) => suggestion.prospectId)).toEqual([other.prospectId]);
    });
  });

  describe("results", () => {
    it("files outreach under an active campaign the prospect belongs to, and counts it with its replies", async () => {
      const seeded = await seedRoute("Results");
      const { campaignId } = await create("Results campaign", { routes: [{ routeId: seeded.routeId }] });
      const inCampaign = await seedProspect("In results", seeded);
      const notIn = await seedProspect("Not in results", seeded);
      await campaignsServices.addCampaignProspects(actor, { campaignId, prospectIds: [inCampaign.prospectId] });
      const send = (prospectId: string, body: string) => outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId, campaignId, channel: "email", body: name(body) }));

      await expect(send(inCampaign.prospectId, "Draft time")).rejects.toMatchObject({ reason: "campaign_not_active" });
      await start(campaignId);
      await expect(send(notIn.prospectId, "Not a member")).rejects.toMatchObject({ reason: "prospect_not_in_campaign" });
      const message = await send(inCampaign.prospectId, "Hello campaign");
      await expect(outreach.logOutreach(actor, logOutreachInputSchema.parse({ prospectId: inCampaign.prospectId, campaignId: uuidv7(), channel: "email", body: name("Unknown") }))).rejects.toMatchObject({ reason: "campaign_not_found" });

      expect(await outreach.getOutreachMessage(message.messageId)).toMatchObject({ campaign: { id: campaignId, name: name("Results campaign") } });
      await interactionsServices.logInteraction(actor, logInteractionInputSchema.parse({ prospectId: inCampaign.prospectId, outreachMessageId: message.messageId, direction: "inbound", channel: "email", type: "reply", body: name("Yes please") }));

      expect((await campaignsServices.getCampaign(campaignId))?.stats).toEqual({ members: 1, contacted: 1, won: 0, messages: 1, replies: 1 });
      await campaignsServices.setCampaignStatus(actor, { campaignId, status: "completed" });
      await expect(send(inCampaign.prospectId, "After the end")).rejects.toMatchObject({ reason: "campaign_not_active" });
    });
  });

  describe("searching", () => {
    it("filters by name, status and scope, finds the campaigns a prospect is in, and pages without skipping", async () => {
      const seeded = await seedRoute("Search");
      const member = await seedProspect("Searcher", seeded);
      const created: string[] = [];
      // A prefix of their own, so a search can pick out exactly these campaigns.
      const prefix = `${suffix} search`;
      for (const label of ["alpha", "beta", "gamma"]) created.push((await campaignsServices.createCampaign(actor, createCampaignInputSchema.parse({ name: `${prefix} ${label}`, routes: [{ routeId: seeded.routeId }] }))).campaignId);
      await campaignsServices.addCampaignProspects(actor, { campaignId: created[1] as string, prospectIds: [member.prospectId] });
      await start(created[2] as string);
      await start(created[0] as string);
      await campaignsServices.setCampaignStatus(actor, { campaignId: created[0] as string, status: "paused" });
      await campaignsServices.archiveCampaign(actor, { campaignId: created[0] as string });

      expect((await page({ q: prefix })).items.map((item) => item.id).toSorted()).toEqual([created[1], created[2]].toSorted());
      expect((await page({ q: prefix, scope: "archived" })).items.map((item) => item.id)).toEqual([created[0]]);
      expect((await page({ q: prefix, status: "active" })).items.map((item) => item.id)).toEqual([created[2]]);
      expect((await page({ prospectId: member.prospectId })).items.map((item) => item.id)).toEqual([created[1]]);

      const seen: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const result = await page({ q: prefix, limit: 1, ...(cursor ? { cursor } : {}) });
        if (pages === 0) expect(result.total).toBe(2);
        seen.push(...result.items.map((item) => item.id));
        cursor = result.nextCursor ?? undefined;
        pages += 1;
      } while (cursor);
      expect(seen.toSorted()).toEqual([created[1], created[2]].toSorted());
      expect(pages).toBe(2);
    });
  });
});
