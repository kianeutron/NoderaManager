// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { createNotesServices } from "@/modules/notes/application/create-notes-services";
import { createOrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { createOrganizationInputSchema, organizationSearchQuerySchema, setOrganizationDomainsInputSchema, updateOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { createPeopleServices } from "@/modules/people/application/create-people-services";
import { createPersonCommandsRepository } from "@/modules/people/data/person-commands.repository";
import { createPersonInputSchema, markDoNotContactInputSchema, personSearchQuerySchema, setPersonEmailsInputSchema, setPersonLinksInputSchema, updatePersonInputSchema } from "@/modules/people/domain/person.schema";
import { createProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { addSignalInputSchema, createProspectInputSchema, prospectSearchQuerySchema, updateProspectInputSchema, updateProspectStatusInputSchema } from "@/modules/prospects/domain/prospect.schema";
import { createRoutesServices } from "@/modules/routes/application/create-routes-services";
import { createRouteInputSchema, createRouteModuleInputSchema } from "@/modules/routes/domain/route.schema";
import { addNoteInputSchema } from "@/modules/notes/domain/note.schema";
import { createActor } from "@/test/factories/actors";
import { auditEvents, organizationDomains, organizations, people, personEmails, personLinks, prospects, routeModules, routes } from "@/shared/db/schema/core";
import { noteLinks, notes } from "@/shared/db/schema/notes";
import { signals } from "@/shared/db/schema/strategy";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("CRM services (real Postgres)", () => {
  // vitest still evaluates this block when the suite is skipped; neon() only connects once a query runs.
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const actor = createActor({ id: `client-${suffix}`, requestId: `request-${suffix}` });
  const routesServices = createRoutesServices({ database });
  const organizationsServices = createOrganizationsServices({ database });
  const peopleServices = createPeopleServices({ database });
  const prospectsServices = createProspectsServices({ database });
  const notesServices = createNotesServices({ database });
  const name = (label: string) => `${label} ${suffix}`;

  const seedRoute = async (label = "Route") => {
    const route = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name(label) }));
    const routeModule = await routesServices.createRouteModule(actor, createRouteModuleInputSchema.parse({ routeId: route.routeId, name: name(`${label} module`) }));
    return { routeId: route.routeId, moduleId: routeModule.routeModuleId };
  };
  const seedPerson = (label: string, fields: Record<string, unknown> = {}) => peopleServices.createPerson(actor, createPersonInputSchema.parse({ fullName: name(label), ...fields }));
  const seedOrganization = (label: string, fields: Record<string, unknown> = {}) => organizationsServices.createOrganization(actor, createOrganizationInputSchema.parse({ name: name(label), ...fields }));
  const auditFor = (entityId: string) => database.select({ action: auditEvents.action, actorType: auditEvents.actorType, source: auditEvents.source }).from(auditEvents).where(eq(auditEvents.entityId, entityId));

  afterAll(async () => {
    const personIds = (await database.select({ id: people.id }).from(people).where(like(people.fullName, `%${suffix}%`))).map((row) => row.id);
    const organizationIds = (await database.select({ id: organizations.id }).from(organizations).where(like(organizations.name, `%${suffix}%`))).map((row) => row.id);
    const prospectIds = personIds.length + organizationIds.length === 0 ? [] : (await database.select({ id: prospects.id }).from(prospects).where(or(personIds.length > 0 ? inArray(prospects.personId, personIds) : undefined, organizationIds.length > 0 ? inArray(prospects.organizationId, organizationIds) : undefined))).map((row) => row.id);
    const noteIds = (await database.select({ id: notes.id }).from(notes).where(like(notes.body, `%${suffix}%`))).map((row) => row.id);

    if (noteIds.length > 0) {
      await database.delete(noteLinks).where(inArray(noteLinks.noteId, noteIds));
      await database.delete(notes).where(inArray(notes.id, noteIds));
    }
    if (prospectIds.length > 0) {
      await database.delete(signals).where(inArray(signals.prospectId, prospectIds));
      await database.delete(prospects).where(inArray(prospects.id, prospectIds));
    }
    if (personIds.length > 0) {
      await database.delete(personLinks).where(inArray(personLinks.personId, personIds));
      await database.delete(personEmails).where(inArray(personEmails.personId, personIds));
      await database.delete(people).where(inArray(people.id, personIds));
    }
    if (organizationIds.length > 0) {
      await database.delete(organizationDomains).where(inArray(organizationDomains.organizationId, organizationIds));
      await database.delete(organizations).where(inArray(organizations.id, organizationIds));
    }
    await database.delete(routeModules).where(like(routeModules.name, `%${suffix}%`));
    await database.delete(routes).where(like(routes.name, `%${suffix}%`));
    await database.delete(auditEvents).where(eq(auditEvents.requestId, actor.requestId));
  });

  describe("routes", () => {
    it("creates routes and modules idempotently, ignoring case, and lists them grouped", async () => {
      const first = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name("Idempotent route"), sortOrder: 5 }));
      const again = await routesServices.createRoute(actor, createRouteInputSchema.parse({ name: name("IDEMPOTENT ROUTE") }));
      const created = await routesServices.createRouteModule(actor, createRouteModuleInputSchema.parse({ routeId: first.routeId, name: name("UX studios") }));
      const moduleAgain = await routesServices.createRouteModule(actor, createRouteModuleInputSchema.parse({ routeId: first.routeId, name: name("ux STUDIOS") }));

      expect(again).toMatchObject({ routeId: first.routeId, created: false, auditEventId: null });
      expect(moduleAgain).toMatchObject({ routeModuleId: created.routeModuleId, created: false });
      const listed = (await routesServices.listRoutes()).find((route) => route.id === first.routeId);
      expect(listed).toMatchObject({ name: name("Idempotent route"), modules: [{ id: created.routeModuleId, name: name("UX studios") }] });
      expect(await auditFor(first.routeId)).toEqual([{ action: "route.created", actorType: "mcp", source: "mcp" }]);
    });
  });

  describe("organizations", () => {
    it("creates an organization with domains, blocks a taken domain and advises on a same name", async () => {
      const created = await seedOrganization("Bluewave", { domains: ["https://www.bluewave-" + suffix + ".io", `wave-${suffix}.co`], countryCode: "de", organizationType: "agency" });

      await expect(seedOrganization("Other", { domains: [`bluewave-${suffix}.io`] })).rejects.toThrow("already belongs to");
      const twin = await seedOrganization("Bluewave", { domains: [] });
      expect(twin.similarOrganizations).toEqual([{ organizationId: created.organizationId, name: name("Bluewave") }]);

      const detail = await organizationsServices.getOrganization(created.organizationId);
      expect(detail).toMatchObject({ name: name("Bluewave"), organizationType: "agency", countryCode: "DE", canonicalDomain: `bluewave-${suffix}.io`, domains: [{ domain: `bluewave-${suffix}.io`, isCanonical: true }, { domain: `wave-${suffix}.co`, isCanonical: false }] });
      expect(await auditFor(created.organizationId)).toEqual([{ action: "organization.created", actorType: "mcp", source: "mcp" }]);
    });

    it("replaces domains atomically, switching the canonical one, and refuses another organization's domain", async () => {
      const first = await seedOrganization("Domains A", { domains: [`a1-${suffix}.io`, `a2-${suffix}.io`] });
      const second = await seedOrganization("Domains B", { domains: [`b1-${suffix}.io`] });

      await expect(organizationsServices.setOrganizationDomains(actor, setOrganizationDomainsInputSchema.parse({ organizationId: first.organizationId, domains: [`b1-${suffix}.io`] }))).rejects.toThrow("already belongs to");

      const result = await organizationsServices.setOrganizationDomains(actor, setOrganizationDomainsInputSchema.parse({ organizationId: first.organizationId, domains: [`a2-${suffix}.io`, `a3-${suffix}.io`] }));
      expect(result).toMatchObject({ changed: true });
      expect((await organizationsServices.getOrganization(first.organizationId))?.domains).toEqual([{ domain: `a2-${suffix}.io`, isCanonical: true }, { domain: `a3-${suffix}.io`, isCanonical: false }]);
      expect((await organizationsServices.getOrganization(second.organizationId))?.domains).toEqual([{ domain: `b1-${suffix}.io`, isCanonical: true }]);

      await organizationsServices.setOrganizationDomains(actor, setOrganizationDomainsInputSchema.parse({ organizationId: first.organizationId, domains: [] }));
      expect((await organizationsServices.getOrganization(first.organizationId))?.domains).toEqual([]);
    });

    it("updates only real differences and keeps the notes text out of audit", async () => {
      const created = await seedOrganization("Editable org", { industry: "SaaS", notes: `private context ${suffix}` });
      const changed = await organizationsServices.updateOrganization(actor, updateOrganizationInputSchema.parse({ organizationId: created.organizationId, name: name("Editable org renamed"), industry: "SaaS", notes: `new private context ${suffix}`, sizeBand: "11_50" }));
      const noop = await organizationsServices.updateOrganization(actor, updateOrganizationInputSchema.parse({ organizationId: created.organizationId, industry: "SaaS" }));

      expect(changed.changed).toBe(true);
      expect(noop).toMatchObject({ changed: false, auditEventId: null });
      expect(await organizationsServices.getOrganization(created.organizationId)).toMatchObject({ name: name("Editable org renamed"), sizeBand: "11_50", notes: `new private context ${suffix}` });
      const [event] = await database.select({ metadata: auditEvents.metadata }).from(auditEvents).where(eq(auditEvents.entityId, created.organizationId)).orderBy(auditEvents.occurredAt).offset(1);
      expect(JSON.stringify(event?.metadata)).not.toContain("private context");
    });

    it("searches by name or domain and walks every page exactly once in both orders", async () => {
      const ids: string[] = [];
      for (const label of ["Pg Ada", "Pg Bea", "Pg Cyd", "Pg Dov", "Pg Eli"]) ids.push((await seedOrganization(label, { domains: [`${label.toLowerCase().replace(" ", "")}-${suffix}.io`] })).organizationId);

      const byDomain = await organizationsServices.searchOrganizations(organizationSearchQuerySchema.parse({ q: `pgcyd-${suffix}` }));
      expect(byDomain.items.map((item) => item.id)).toEqual([ids[2]]);

      for (const [sort, expected] of [["updated", [...ids].reverse()], ["name", ids]] as const) {
        const seen: string[] = [];
        let cursor: string | undefined;
        let firstTotal: number | null = null;
        do {
          const page = await organizationsServices.searchOrganizations(organizationSearchQuerySchema.parse({ q: "pg", sort, limit: 2, ...(cursor ? { cursor } : {}) }));
          firstTotal ??= page.total;
          seen.push(...page.items.map((item) => item.id).filter((id) => ids.includes(id)));
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        expect(seen, sort).toEqual(expected);
        expect(firstTotal).toBeGreaterThanOrEqual(5);
      }
    });
  });

  describe("people", () => {
    it("creates a person with a primary email, audited without contact details", async () => {
      const organization = await seedOrganization("Employer");
      const created = await seedPerson("Marta Chen", { emails: [`Marta-${suffix}@Bluewave.io`, `m-${suffix}@x.io`], organizationId: organization.organizationId, persona: "recruiter", languages: ["en", "de"], countryCode: "de", linkedinUrl: `https://www.linkedin.com/in/Marta-${suffix}/` });

      expect(created).toMatchObject({ created: true, possibleDuplicates: [] });
      const detail = await peopleServices.getPerson(created.personId);
      expect(detail).toMatchObject({ fullName: name("Marta Chen"), persona: "recruiter", countryCode: "DE", languages: ["en", "de"], organization: { id: organization.organizationId, name: name("Employer") }, doNotContact: false, emails: [{ email: `Marta-${suffix}@Bluewave.io`, isPrimary: true }, { email: `m-${suffix}@x.io`, isPrimary: false }] });
      const [event] = await database.select({ summary: auditEvents.summary, metadata: auditEvents.metadata }).from(auditEvents).where(eq(auditEvents.entityId, created.personId));
      expect(JSON.stringify(event)).not.toMatch(/bluewave|x\.io|linkedin\.com/i);
    });

    it("finds each person once however many emails match, and ranks exact above strong above weak", async () => {
      const organization = await seedOrganization("Dedupe org");
      const exact = await seedPerson("Dana Dupe", { emails: [`d1-${suffix}@x.io`, `d2-${suffix}@x.io`] });
      const strong = await seedPerson("Erin Dupe", { organizationId: organization.organizationId });

      const both = await peopleServices.findDuplicateCandidates({ fullName: name("Erin Dupe"), emails: [`d1-${suffix}@x.io`, `d2-${suffix}@x.io`], organizationId: organization.organizationId });
      expect(both.map((candidate) => [candidate.personId, candidate.matchLevel])).toEqual([[exact.personId, "exact"], [strong.personId, "strong"]]);
    });

    it("blocks an exact duplicate, gates a strong one behind confirmation and reports a weak one", async () => {
      const organization = await seedOrganization("Gate org");
      const original = await seedPerson("Gia Gate", { emails: [`g-${suffix}@x.io`], organizationId: organization.organizationId });

      await expect(seedPerson("Someone Else", { emails: [`G-${suffix}@X.io`] })).rejects.toThrow(`(person ${original.personId}) already exists`);
      await expect(seedPerson("Gia Gate", { organizationId: organization.organizationId })).rejects.toThrow("confirmNewIdentity: true");

      const confirmed = await seedPerson("Gia Gate", { organizationId: organization.organizationId, confirmNewIdentity: true });
      expect(confirmed.possibleDuplicates).toMatchObject([{ personId: original.personId, matchLevel: "strong" }]);
      // Without an organization, the same name is only a weak match against both existing people: reported, never blocking.
      const weak = await seedPerson("Gia Gate", {});
      expect(weak.possibleDuplicates.map((candidate) => candidate.matchLevel)).toEqual(["weak", "weak"]);
    });

    it("replaces emails with a new primary, refuses another person's address and clears on request", async () => {
      const a = await seedPerson("Emil A", { emails: [`ea1-${suffix}@x.io`, `ea2-${suffix}@x.io`] });
      const b = await seedPerson("Emil B", { emails: [`eb-${suffix}@x.io`] });

      await expect(peopleServices.setPersonEmails(actor, setPersonEmailsInputSchema.parse({ personId: a.personId, emails: [`eb-${suffix}@x.io`] }))).rejects.toThrow("already belongs to");
      const result = await peopleServices.setPersonEmails(actor, setPersonEmailsInputSchema.parse({ personId: a.personId, emails: [`ea2-${suffix}@x.io`, `ea3-${suffix}@x.io`] }));
      expect(result.changed).toBe(true);
      expect((await peopleServices.getPerson(a.personId))?.emails).toEqual([{ email: `ea2-${suffix}@x.io`, isPrimary: true }, { email: `ea3-${suffix}@x.io`, isPrimary: false }]);
      expect((await peopleServices.getPerson(b.personId))?.emails).toEqual([{ email: `eb-${suffix}@x.io`, isPrimary: true }]);

      await peopleServices.setPersonEmails(actor, setPersonEmailsInputSchema.parse({ personId: a.personId, emails: [] }));
      expect((await peopleServices.getPerson(a.personId))?.emails).toEqual([]);
    });

    it("updates a person, protects the LinkedIn identity and clears optional fields", async () => {
      const a = await seedPerson("Upd A", { role: "CTO", linkedinUrl: `https://linkedin.com/in/upd-a-${suffix}` });
      const b = await seedPerson("Upd B", {});

      await expect(peopleServices.updatePerson(actor, updatePersonInputSchema.parse({ personId: b.personId, linkedinUrl: `https://www.linkedin.com/in/UPD-A-${suffix}/` }))).rejects.toThrow("already belongs to");
      await peopleServices.updatePerson(actor, updatePersonInputSchema.parse({ personId: a.personId, fullName: name("Upd A Renamed"), role: null, languages: ["fr"] }));
      expect(await peopleServices.getPerson(a.personId)).toMatchObject({ fullName: name("Upd A Renamed"), role: null, languages: ["fr"] });
      expect((await peopleServices.searchPeople(personSearchQuerySchema.parse({ q: `upd a renamed ${suffix}` }))).items.map((item) => item.id)).toEqual([a.personId]);
    });

    it("flags and clears do-not-contact, and a flagged person cannot become a prospect", async () => {
      const { routeId } = await seedRoute("DNC route");
      const person = await seedPerson("Dnc Person", {});
      await peopleServices.markPersonDoNotContact(actor, markDoNotContactInputSchema.parse({ personId: person.personId, reason: "Asked to stop" }));

      expect(await peopleServices.getPerson(person.personId)).toMatchObject({ doNotContact: true, doNotContactReason: "Asked to stop" });
      await expect(prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, routeId }))).rejects.toThrow("do-not-contact");

      await peopleServices.clearPersonDoNotContact(actor, { personId: person.personId });
      expect((await peopleServices.getPerson(person.personId))?.doNotContact).toBe(false);
      expect(await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, routeId }))).toMatchObject({ created: true });
    });

    it("searches by name, email or LinkedIn and pages through every match exactly once in both orders", async () => {
      const ids: string[] = [];
      for (const label of ["Wp Ada", "Wp Bea", "Wp Cyd", "Wp Dov", "Wp Eli"]) ids.push((await seedPerson(label, { emails: [`${label.toLowerCase().replace(" ", "")}-${suffix}@x.io`] })).personId);

      expect((await peopleServices.searchPeople(personSearchQuerySchema.parse({ q: `wpcyd-${suffix}@x.io` }))).items.map((item) => item.id)).toEqual([ids[2]]);

      for (const [sort, expected] of [["updated", [...ids].reverse()], ["name", ids]] as const) {
        const seen: string[] = [];
        let cursor: string | undefined;
        let firstTotal: number | null = null;
        let pages = 0;
        do {
          const page = await peopleServices.searchPeople(personSearchQuerySchema.parse({ q: `wp`, sort, limit: 2, ...(cursor ? { cursor } : {}) }));
          firstTotal ??= page.total;
          if (pages > 0) expect(page.total).toBeNull();
          seen.push(...page.items.map((item) => item.id).filter((id) => ids.includes(id)));
          cursor = page.nextCursor ?? undefined;
          pages += 1;
        } while (cursor);
        expect(seen, sort).toEqual(expected);
        expect(firstTotal).toBeGreaterThanOrEqual(5);
        expect(pages).toBeGreaterThanOrEqual(3);
      }
    });

    it("commits a person and its audit event atomically: a failing batch leaves nothing behind", async () => {
      const existing = await seedPerson("Atomic Base", { emails: [`atomic-${suffix}@x.io`] });
      const personId = uuidv7();

      await expect(createPersonCommandsRepository(database).insertPerson({
        personId, organizationId: null, fullName: name("Atomic Victim"), normalizedName: name("atomic victim").toLowerCase(), linkedinUrl: null, normalizedLinkedinUrl: null, role: null, persona: null, countryCode: null, city: null, languages: [],
        // The same normalized email violates a unique index on the second statement of the batch.
        emails: [{ email: `atomic-${suffix}@x.io`, normalizedEmail: `atomic-${suffix}@x.io`, isPrimary: true }],
        audit: { actorType: "mcp", actorId: actor.id, requestId: actor.requestId, source: "mcp", action: "person.created", entityType: "person", entityId: personId, summary: "should not persist", metadata: {} }
      })).rejects.toThrow();

      expect(existing.created).toBe(true);
      expect(await database.select({ id: people.id }).from(people).where(eq(people.id, personId))).toHaveLength(0);
      expect(await auditFor(personId)).toHaveLength(0);
    });
  });

  describe("prospects, signals and notes", () => {
    it("creates a prospect idempotently and validates the route/module pair", async () => {
      const { routeId, moduleId } = await seedRoute("Prospect route");
      const other = await seedRoute("Other route");
      const person = await seedPerson("Pia Prospect", {});
      const input = createProspectInputSchema.parse({ personId: person.personId, routeId, routeModuleId: moduleId, whyTargeted: `Runs a studio needing overflow, quokka${suffix}`, source: "referral", temperature: "warm" });

      const created = await prospectsServices.createProspect(actor, input);
      const again = await prospectsServices.createProspect(actor, input);
      expect(created).toMatchObject({ created: true });
      expect(again).toMatchObject({ prospectId: created.prospectId, created: false, auditEventId: null });
      expect(await auditFor(created.prospectId)).toEqual([{ action: "prospect.created", actorType: "mcp", source: "mcp" }]);

      await expect(prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, routeId, routeModuleId: other.moduleId }))).rejects.toThrow("does not exist in this route");
    });

    it("tracks status with the structural-reason rule and reopens a closed prospect as a new one", async () => {
      const { routeId } = await seedRoute("Status route");
      const person = await seedPerson("Stan Status", {});
      const created = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, routeId }));

      // Bypasses the schema on purpose: the service enforces the rule again for any caller that skips validation.
      await expect(prospectsServices.updateProspectStatus(actor, { prospectId: created.prospectId, status: "disqualified" })).rejects.toThrow("needs a structuralReason");
      const moved = await prospectsServices.updateProspectStatus(actor, updateProspectStatusInputSchema.parse({ prospectId: created.prospectId, status: "disqualified", structuralReason: "residency" }));
      expect(moved).toMatchObject({ previousStatus: "researched", status: "disqualified", changed: true });
      expect(await prospectsServices.getProspect(created.prospectId)).toMatchObject({ status: "disqualified", structuralReason: "residency" });

      await prospectsServices.updateProspectStatus(actor, updateProspectStatusInputSchema.parse({ prospectId: created.prospectId, status: "dormant" }));
      expect((await prospectsServices.getProspect(created.prospectId))?.structuralReason).toBeNull();

      await prospectsServices.updateProspectStatus(actor, updateProspectStatusInputSchema.parse({ prospectId: created.prospectId, status: "lost" }));
      const reopened = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, routeId }));
      expect(reopened).toMatchObject({ created: true });
      expect(reopened.prospectId).not.toBe(created.prospectId);
    });

    it("updates route, module and qualification fields, clearing the module on a route change", async () => {
      const first = await seedRoute("Move from");
      const second = await seedRoute("Move to");
      const person = await seedPerson("Moe Mover", {});
      const created = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, routeId: first.routeId, routeModuleId: first.moduleId }));

      await prospectsServices.updateProspect(actor, updateProspectInputSchema.parse({ prospectId: created.prospectId, routeId: second.routeId, currentTrigger: "Just raised a round" }));
      expect(await prospectsServices.getProspect(created.prospectId)).toMatchObject({ route: { id: second.routeId }, module: null, currentTrigger: "Just raised a round" });

      await expect(prospectsServices.updateProspect(actor, updateProspectInputSchema.parse({ prospectId: created.prospectId, routeModuleId: first.moduleId }))).rejects.toThrow("does not exist in this route");
    });

    it("adds signals idempotently and notes to several records, and shows both in the details", async () => {
      const { routeId } = await seedRoute("Signal route");
      const organization = await seedOrganization("Signal org");
      const person = await seedPerson("Sig Person", { organizationId: organization.organizationId });
      const prospect = await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, organizationId: organization.organizationId, routeId }));

      const signal = addSignalInputSchema.parse({ prospectId: prospect.prospectId, type: "live_role", summary: `Hiring a fractional CTO ${suffix}`, sourceUrl: "https://bluewave.io/jobs", observedAt: "2026-09-01T10:00:00Z" });
      const first = await prospectsServices.addSignal(actor, signal);
      const second = await prospectsServices.addSignal(actor, { ...signal, summary: signal.summary.toUpperCase() });
      expect(second).toMatchObject({ signalId: first.signalId, created: false });

      const note = addNoteInputSchema.parse({ body: `Met at the conference ${suffix}`, targets: [{ targetType: "person", targetId: person.personId }, { targetType: "prospect", targetId: prospect.prospectId }] });
      const added = await notesServices.addNote(actor, note);
      expect(await notesServices.addNote(actor, note)).toMatchObject({ noteId: added.noteId, created: false });
      await expect(notesServices.addNote(actor, addNoteInputSchema.parse({ body: "x", targets: [{ targetType: "person", targetId: uuidv7() }] }))).rejects.toThrow("person to attach the note to was not found");

      const detail = await prospectsServices.getProspect(prospect.prospectId);
      expect(detail?.signals).toMatchObject([{ id: first.signalId, type: "live_role", observedAt: "2026-09-01T10:00:00.000Z" }]);
      expect(detail?.recentNotes.map((item) => item.body)).toEqual([`Met at the conference ${suffix}`]);
      expect((await peopleServices.getPerson(person.personId))?.recentNotes).toHaveLength(1);
      expect((await peopleServices.getPerson(person.personId))?.prospects).toMatchObject([{ id: prospect.prospectId, status: "researched", routeName: name("Signal route") }]);
      expect((await organizationsServices.getOrganization(organization.organizationId))).toMatchObject({ people: [{ id: person.personId }], prospects: [{ id: prospect.prospectId }], recentNotes: [] });
    });

    it("searches prospects by status, route, country and text, and pages through every match once", async () => {
      const { routeId } = await seedRoute("Search route");
      const german = await seedOrganization("German org", { countryCode: "de" });
      const ids: string[] = [];
      for (const [label, extra] of [["Sp Ada", { organizationId: german.organizationId }], ["Sp Bea", {}], ["Sp Cyd", {}], ["Sp Dov", {}], ["Sp Eli", {}]] as const) {
        const person = await seedPerson(label, label === "Sp Bea" ? { countryCode: "fr" } : {});
        ids.push((await prospectsServices.createProspect(actor, createProspectInputSchema.parse({ personId: person.personId, routeId, whyTargeted: label === "Sp Cyd" ? `marmot${suffix} builder` : undefined, ...extra }))).prospectId);
      }
      await prospectsServices.updateProspectStatus(actor, updateProspectStatusInputSchema.parse({ prospectId: ids[3] ?? "", status: "warm" }));

      const search = async (fields: Record<string, unknown>) => (await prospectsServices.searchProspects(prospectSearchQuerySchema.parse({ routeId, ...fields }))).items.map((item) => item.id);
      expect(await search({ statuses: ["warm"] })).toEqual([ids[3]]);
      expect(await search({ countryCode: "de" })).toEqual([ids[0]]);
      expect(await search({ countryCode: "FR" })).toEqual([ids[1]]);
      expect(await search({ q: `marmot${suffix}` })).toEqual([ids[2]]);
      expect(await search({ q: `sp eli ${suffix}` })).toEqual([ids[4]]);

      const seen: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const page = await prospectsServices.searchProspects(prospectSearchQuerySchema.parse({ routeId, limit: 2, ...(cursor ? { cursor } : {}) }));
        if (pages === 0) expect(page.total).toBe(5);
        seen.push(...page.items.map((item) => item.id));
        cursor = page.nextCursor ?? undefined;
        pages += 1;
      } while (cursor);
      // Newest activity first: the status change moved ids[3] to the top; the rest keep reverse creation order.
      expect(seen).toEqual([ids[3], ids[4], ids[2], ids[1], ids[0]]);
      expect(pages).toBe(3);
    });
  });

  describe("archiving", () => {
    it("hides a person from the default list, finds them in the archived one, and restores them", async () => {
      const { personId } = await seedPerson("Archivable person");
      const listed = async (scope: "active" | "archived") => (await peopleServices.searchPeople(personSearchQuerySchema.parse({ q: name("Archivable person"), scope }))).items.map((item) => item.id);

      expect(await listed("active")).toEqual([personId]);
      await expect(peopleServices.archivePerson(actor, { personId })).resolves.toMatchObject({ archived: true, changed: true });
      expect(await listed("active")).toEqual([]);
      expect(await listed("archived")).toEqual([personId]);

      // Still readable (to show and restore), but no longer editable or linkable.
      expect(await peopleServices.getPerson(personId)).toMatchObject({ id: personId, archivedAt: expect.any(String) });
      await expect(peopleServices.updatePerson(actor, updatePersonInputSchema.parse({ personId, city: "Berlin" }))).rejects.toMatchObject({ code: "not_found" });
      await expect(peopleServices.archivePerson(actor, { personId })).resolves.toMatchObject({ changed: false, auditEventId: null });

      await expect(peopleServices.restorePerson(actor, { personId })).resolves.toMatchObject({ archived: false, changed: true });
      expect(await listed("active")).toEqual([personId]);
      expect(await peopleServices.getPerson(personId)).toMatchObject({ archivedAt: null });
      expect((await auditFor(personId)).map((event) => event.action)).toEqual(expect.arrayContaining(["person.archived", "person.restored"]));
    });

    it("does the same for organizations", async () => {
      const { organizationId } = await seedOrganization("Archivable company");
      const listed = async (scope: "active" | "archived") => (await organizationsServices.searchOrganizations(organizationSearchQuerySchema.parse({ q: name("Archivable company"), scope }))).items.map((item) => item.id);

      await organizationsServices.archiveOrganization(actor, { organizationId });
      expect(await listed("active")).toEqual([]);
      expect(await listed("archived")).toEqual([organizationId]);
      expect(await organizationsServices.getOrganization(organizationId)).toMatchObject({ archivedAt: expect.any(String) });

      await organizationsServices.restoreOrganization(actor, { organizationId });
      expect(await listed("active")).toEqual([organizationId]);
    });

    it("finds companies that already use a name, ignoring case, but never archived ones", async () => {
      const { organizationId } = await seedOrganization("Shared name");
      expect(await organizationsServices.findSimilarOrganizations({ name: name("SHARED NAME") })).toEqual([{ organizationId, name: name("Shared name") }]);

      await organizationsServices.archiveOrganization(actor, { organizationId });
      expect(await organizationsServices.findSimilarOrganizations({ name: name("Shared name") })).toEqual([]);
    });
  });

  describe("person links", () => {
    it("replaces the whole list, keeps a link's row when it stays, and treats respellings as the same page", async () => {
      const { personId } = await seedPerson("Linked person");
      const set = (links: unknown[]) => peopleServices.setPersonLinks(actor, setPersonLinksInputSchema.parse({ personId, links }));

      await expect(set([{ type: "website", url: "https://www.marta.dev/", label: "Home" }, { type: "github", url: "https://github.com/marta" }])).resolves.toMatchObject({ count: 2, changed: true });
      const before = await database.select({ id: personLinks.id, url: personLinks.url }).from(personLinks).where(eq(personLinks.personId, personId));
      expect(before).toHaveLength(2);

      await expect(set([{ type: "website", url: "http://marta.dev", label: "Home" }, { type: "github", url: "https://github.com/marta/" }])).resolves.toMatchObject({ changed: false, auditEventId: null });

      await expect(set([{ type: "portfolio", url: "https://marta.dev", label: "Work" }])).resolves.toMatchObject({ count: 1, changed: true });
      const after = await database.select({ id: personLinks.id, type: personLinks.type, label: personLinks.label }).from(personLinks).where(eq(personLinks.personId, personId));
      expect(after).toEqual([{ id: before.find((row) => row.url.includes("marta.dev"))?.id, type: "portfolio", label: "Work" }]);
      expect((await peopleServices.getPerson(personId))?.links).toEqual([{ type: "portfolio", url: "https://marta.dev", label: "Work" }]);

      await expect(set([])).resolves.toMatchObject({ count: 0, changed: true });
      expect((await peopleServices.getPerson(personId))?.links).toEqual([]);
    });
  });
});
