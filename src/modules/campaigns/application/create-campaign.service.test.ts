import { describe, expect, it, vi } from "vitest";
import { createCampaign } from "@/modules/campaigns/application/create-campaign.service";
import { createCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";
import { createActor } from "@/test/factories/actors";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";

function createDependencies(existing: Record<string, unknown> | null = null, route: Record<string, unknown> | null = { id: routeId, archivedAt: null }, routeModule: Record<string, unknown> | null = { id: moduleId, routeId, archivedAt: null }) {
  return {
    reads: { findCampaignByNormalizedName: vi.fn().mockResolvedValue(existing) },
    routes: { findRoute: vi.fn().mockResolvedValue(route), findModule: vi.fn().mockResolvedValue(routeModule) },
    commands: { insertCampaign: vi.fn().mockResolvedValue("audit-1") }
  };
}
const parse = (input: Record<string, unknown>) => createCampaignInputSchema.parse({ name: "Q4 agencies", ...input });

describe("createCampaign", () => {
  it("creates a draft with its routes and rules, and audits it without the goal", async () => {
    const dependencies = createDependencies();
    const result = await createCampaign(dependencies, createActor(), parse({ goal: "Private aim", routes: [{ routeId }, { routeId, routeModuleId: moduleId }], targetingRules: { personas: ["recruiter"] } }));

    expect(dependencies.commands.insertCampaign).toHaveBeenCalledWith(expect.objectContaining({ name: "Q4 agencies", normalizedName: "q4 agencies", goal: "Private aim", routes: [{ routeId, routeModuleId: null }, { routeId, routeModuleId: moduleId }], targetingRules: { personas: ["recruiter"], countries: [], organizationTypes: [] } }));
    expect(result).toEqual({ campaignId: expect.any(String), created: true, auditEventId: "audit-1" });
    const { audit } = dependencies.commands.insertCampaign.mock.calls[0]?.[0] as { audit: { action: string } };
    expect(audit.action).toBe("campaign.created");
    expect(JSON.stringify(audit)).not.toContain("Private aim");
  });

  it("returns the existing campaign for the same name, before checking anything else", async () => {
    const dependencies = createDependencies({ id: "c-first", archivedAt: null });

    await expect(createCampaign(dependencies, createActor(), parse({}))).resolves.toEqual({ campaignId: "c-first", created: false, auditEventId: null });
    expect(dependencies.commands.insertCampaign).not.toHaveBeenCalled();
    expect(dependencies.reads.findCampaignByNormalizedName).toHaveBeenCalledWith("q4 agencies");
  });

  it("refuses a name that belongs to an archived campaign", async () => {
    await expect(createCampaign(createDependencies({ id: "c-old", archivedAt: new Date() }), createActor(), parse({}))).rejects.toMatchObject({ code: "conflict", reason: "campaign_name_taken" });
  });

  it("refuses a route that is missing or archived, and a module of another route", async () => {
    await expect(createCampaign(createDependencies(null, null), createActor(), parse({ routes: [{ routeId }] }))).rejects.toMatchObject({ reason: "route_not_found" });
    await expect(createCampaign(createDependencies(null, { id: routeId, archivedAt: new Date() }), createActor(), parse({ routes: [{ routeId }] }))).rejects.toMatchObject({ reason: "route_not_found" });
    await expect(createCampaign(createDependencies(null, undefined, { id: moduleId, routeId: "another", archivedAt: null }), createActor(), parse({ routes: [{ routeId, routeModuleId: moduleId }] }))).rejects.toMatchObject({ reason: "module_not_in_route" });
  });
});
