import { describe, expect, it, vi } from "vitest";
import { addCampaignProspects, listCampaignMembers, removeCampaignProspects, suggestCampaignProspects } from "@/modules/campaigns/application/campaign-members.service";
import { campaignMembersQuerySchema, campaignProspectsInputSchema, campaignSuggestionsQuerySchema, memberPagination } from "@/modules/campaigns/domain/campaign.schema";
import { createActor } from "@/test/factories/actors";

const campaignId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const first = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const second = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92";
const campaign: { id: string; name: string; status: string; archivedAt: Date | null; targetingRules: unknown } = { id: campaignId, name: "Q4", status: "active", archivedAt: null, targetingRules: { personas: ["recruiter"], countries: [], organizationTypes: [] } };
const routesOf = (...entries: { routeId: string; moduleId: string | null }[]) => entries;
const parse = (prospectIds: string[]) => campaignProspectsInputSchema.parse({ campaignId, prospectIds });

type ProspectRow = { id: string; routeId: string; routeModuleId: string | null; archivedAt: Date | null };

function addDependencies({ found = campaign, prospects = [{ id: first, routeId: "r1", routeModuleId: null, archivedAt: null }, { id: second, routeId: "r1", routeModuleId: "m1", archivedAt: null }] as ProspectRow[], members = [] as string[], routes = routesOf({ routeId: "r1", moduleId: null }) } = {}) {
  return {
    reads: { findCampaign: vi.fn().mockResolvedValue(found), listCampaignRoutes: vi.fn().mockResolvedValue(routes), findProspectsForMembership: vi.fn().mockResolvedValue(prospects), findMemberIds: vi.fn().mockResolvedValue(members) },
    commands: { addMembers: vi.fn().mockResolvedValue("audit-1"), removeMembers: vi.fn().mockResolvedValue("audit-2") }
  };
}

describe("addCampaignProspects", () => {
  it("adds prospects on the campaign's routes and audits their ids", async () => {
    const dependencies = addDependencies();
    const result = await addCampaignProspects(dependencies, createActor(), parse([first, second]));

    expect(dependencies.commands.addMembers).toHaveBeenCalledWith(campaignId, [first, second], expect.objectContaining({ action: "campaign.prospects_added", metadata: { prospectIds: [first, second] } }));
    expect(result).toEqual({ campaignId, changed: 2, unchanged: 0, auditEventId: "audit-1" });
  });

  it("adds only the new ones, and is a no-op when they are all in already", async () => {
    const partly = addDependencies({ members: [first] });
    await expect(addCampaignProspects(partly, createActor(), parse([first, second]))).resolves.toMatchObject({ changed: 1, unchanged: 1 });
    expect(partly.commands.addMembers).toHaveBeenCalledWith(campaignId, [second], expect.anything());

    const all = addDependencies({ members: [first, second] });
    await expect(addCampaignProspects(all, createActor(), parse([first, second]))).resolves.toEqual({ campaignId, changed: 0, unchanged: 2, auditEventId: null });
    expect(all.commands.addMembers).not.toHaveBeenCalled();
  });

  it("refuses a prospect on a route the campaign does not work, but takes any when it has no routes yet", async () => {
    const justFirst = [{ id: first, routeId: "r1", routeModuleId: null, archivedAt: null }];
    await expect(addCampaignProspects(addDependencies({ prospects: justFirst, routes: routesOf({ routeId: "other", moduleId: null }) }), createActor(), parse([first]))).rejects.toMatchObject({ reason: "prospect_outside_campaign_routes" });
    await expect(addCampaignProspects(addDependencies({ prospects: justFirst, routes: [] }), createActor(), parse([first]))).resolves.toMatchObject({ changed: 1 });
  });

  it("refuses an unknown or archived prospect, and a completed, archived or missing campaign", async () => {
    await expect(addCampaignProspects(addDependencies({ prospects: [{ id: first, routeId: "r1", routeModuleId: null, archivedAt: null }] }), createActor(), parse([first, second]))).rejects.toMatchObject({ code: "not_found" });
    await expect(addCampaignProspects(addDependencies({ prospects: [{ id: first, routeId: "r1", routeModuleId: null, archivedAt: new Date() }] }), createActor(), parse([first]))).rejects.toMatchObject({ code: "not_found" });
    await expect(addCampaignProspects(addDependencies({ found: { ...campaign, status: "completed" } }), createActor(), parse([first]))).rejects.toMatchObject({ reason: "campaign_finished" });
    await expect(addCampaignProspects(addDependencies({ found: { ...campaign, archivedAt: new Date() } }), createActor(), parse([first]))).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("removeCampaignProspects", () => {
  it("removes only those that were members, and ignores the rest", async () => {
    const dependencies = addDependencies({ members: [first] });
    const result = await removeCampaignProspects(dependencies, createActor(), parse([first, second]));

    expect(dependencies.commands.removeMembers).toHaveBeenCalledWith(campaignId, [first], expect.objectContaining({ action: "campaign.prospects_removed" }));
    expect(result).toEqual({ campaignId, changed: 1, unchanged: 1, auditEventId: "audit-2" });
  });

  it("is a no-op when none were members, and refuses a completed campaign", async () => {
    const dependencies = addDependencies({ members: [] });
    await expect(removeCampaignProspects(dependencies, createActor(), parse([first]))).resolves.toMatchObject({ changed: 0, auditEventId: null });
    expect(dependencies.commands.removeMembers).not.toHaveBeenCalled();
    await expect(removeCampaignProspects(addDependencies({ found: { ...campaign, status: "completed" } }), createActor(), parse([first]))).rejects.toMatchObject({ reason: "campaign_finished" });
  });
});

describe("listCampaignMembers", () => {
  const row = (index: number) => ({ membershipId: `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}`, prospectId: `p${index}`, status: "contacted", lastContactedAt: null, routeName: "Agencies", moduleName: null, personId: "person-1", personName: "Marta Chen", organizationId: null, organizationName: null, addedAt: new Date("2026-09-01T00:00:00Z"), sortKey: "2026-09-01 00:00:00+00" });

  it("pages with a cursor carrying the membership id, counts only on the first page, and maps the rows", async () => {
    const reads = { findCampaign: vi.fn().mockResolvedValue(campaign), listMembers: vi.fn().mockResolvedValue([row(1), row(2), row(3)]), countMembers: vi.fn().mockResolvedValue(7) };
    const page = await listCampaignMembers(reads, campaignId, campaignMembersQuerySchema.parse({ limit: "2" }));

    expect(page.total).toBe(7);
    expect(page.items[0]).toMatchObject({ prospectId: "p1", person: { id: "person-1", fullName: "Marta Chen" }, organization: null, addedAt: "2026-09-01T00:00:00.000Z" });
    expect(memberPagination.decode(page.nextCursor as string)).toMatchObject({ sort: "added", id: row(2).membershipId });

    reads.countMembers.mockClear();
    const next = await listCampaignMembers(reads, campaignId, campaignMembersQuerySchema.parse({ limit: "2", cursor: page.nextCursor }));
    expect(reads.countMembers).not.toHaveBeenCalled();
    expect(next.total).toBeNull();
  });

  it("reports an unknown campaign", async () => {
    await expect(listCampaignMembers({ findCampaign: vi.fn().mockResolvedValue(null), listMembers: vi.fn(), countMembers: vi.fn() }, campaignId, campaignMembersQuerySchema.parse({}))).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("suggestCampaignProspects", () => {
  const candidate = (id: string, persona: string | null) => ({ prospectId: id, status: "ready", lastContactedAt: null, routeName: "Agencies", moduleName: null, personId: `person-${id}`, personName: `Person ${id}`, organizationId: null, organizationName: null, persona, personCountry: null, organizationCountry: null, organizationType: null });
  const reads = (candidates: ReturnType<typeof candidate>[], found = campaign) => ({ findCampaign: vi.fn().mockResolvedValue(found), listCampaignRoutes: vi.fn().mockResolvedValue(routesOf({ routeId: "r1", moduleId: "m1" })), listSuggestionCandidates: vi.fn().mockResolvedValue(candidates) });

  it("puts prospects that fit the rules first, marks them, and keeps the rest in order after", async () => {
    const dependencies = reads([candidate("a", "founder"), candidate("b", "recruiter"), candidate("c", null), candidate("d", "recruiter")]);
    const suggestions = await suggestCampaignProspects(dependencies, campaignId, campaignSuggestionsQuerySchema.parse({}));

    expect(suggestions.map((suggestion) => [suggestion.prospectId, suggestion.matchesRules])).toEqual([["b", true], ["d", true], ["a", false], ["c", false]]);
    expect(dependencies.listSuggestionCandidates).toHaveBeenCalledWith({ campaignId, routeEntries: [{ routeId: "r1", routeModuleId: "m1" }], q: undefined });
  });

  it("respects the limit and passes the search text on", async () => {
    const dependencies = reads([candidate("a", "recruiter"), candidate("b", "recruiter"), candidate("c", "recruiter")]);
    expect(await suggestCampaignProspects(dependencies, campaignId, campaignSuggestionsQuerySchema.parse({ limit: "2", q: "marta" }))).toHaveLength(2);
    expect(dependencies.listSuggestionCandidates).toHaveBeenCalledWith(expect.objectContaining({ q: "marta" }));
  });

  it("suggests nothing for a finished campaign, and reports an unknown or archived one", async () => {
    const finished = reads([candidate("a", "recruiter")], { ...campaign, status: "completed" });
    expect(await suggestCampaignProspects(finished, campaignId, campaignSuggestionsQuerySchema.parse({}))).toEqual([]);
    expect(finished.listSuggestionCandidates).not.toHaveBeenCalled();
    await expect(suggestCampaignProspects(reads([], { ...campaign, archivedAt: new Date() }), campaignId, campaignSuggestionsQuerySchema.parse({}))).rejects.toMatchObject({ code: "not_found" });
  });
});
