import { describe, expect, it, vi } from "vitest";
import { setCampaignRoutes } from "@/modules/campaigns/application/set-campaign-routes.service";
import { setCampaignRoutesInputSchema } from "@/modules/campaigns/domain/campaign.schema";
import { createActor } from "@/test/factories/actors";

const campaignId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const routeA = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const routeB = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d92";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d93";

function createDependencies(status = "draft", current: { routeId: string; moduleId: string | null }[] = []) {
  return {
    reads: { findCampaign: vi.fn().mockResolvedValue({ id: campaignId, name: "Q4", status, archivedAt: null }), listCampaignRoutes: vi.fn().mockResolvedValue(current) },
    routes: { findRoute: vi.fn().mockResolvedValue({ id: routeA, archivedAt: null }), findModule: vi.fn().mockResolvedValue({ id: moduleId, routeId: routeA, archivedAt: null }) },
    commands: { replaceRoutes: vi.fn().mockResolvedValue("audit-1") }
  };
}
const parse = (routes: Record<string, unknown>[]) => setCampaignRoutesInputSchema.parse({ campaignId, routes });

describe("setCampaignRoutes", () => {
  it("replaces the list, audits the counts, and validates every route", async () => {
    const dependencies = createDependencies();
    const result = await setCampaignRoutes(dependencies, createActor(), parse([{ routeId: routeA }, { routeId: routeA, routeModuleId: moduleId }]));

    expect(dependencies.commands.replaceRoutes).toHaveBeenCalledWith(campaignId, [{ routeId: routeA, routeModuleId: null }, { routeId: routeA, routeModuleId: moduleId }], expect.objectContaining({ action: "campaign.routes_set", metadata: { before: 0, after: 2 } }));
    expect(dependencies.routes.findRoute).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ campaignId, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when the same set is given again, in any order", async () => {
    const dependencies = createDependencies("active", [{ routeId: routeA, moduleId: moduleId }, { routeId: routeB, moduleId: null }]);
    dependencies.routes.findRoute.mockResolvedValue({ id: routeB, archivedAt: null });
    dependencies.routes.findModule.mockResolvedValue({ id: moduleId, routeId: routeA, archivedAt: null });

    await expect(setCampaignRoutes(dependencies, createActor(), parse([{ routeId: routeB }, { routeId: routeA, routeModuleId: moduleId }]))).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.replaceRoutes).not.toHaveBeenCalled();
  });

  it("lets a draft be emptied, but a running or paused campaign must keep a route", async () => {
    await expect(setCampaignRoutes(createDependencies("draft", [{ routeId: routeA, moduleId: null }]), createActor(), parse([]))).resolves.toMatchObject({ changed: true });
    for (const status of ["active", "paused"]) await expect(setCampaignRoutes(createDependencies(status, [{ routeId: routeA, moduleId: null }]), createActor(), parse([]))).rejects.toMatchObject({ reason: "campaign_needs_route" });
  });

  it("refuses a completed campaign, and an archived or missing route", async () => {
    await expect(setCampaignRoutes(createDependencies("completed"), createActor(), parse([{ routeId: routeA }]))).rejects.toMatchObject({ reason: "campaign_finished" });
    const dependencies = createDependencies();
    dependencies.routes.findRoute.mockResolvedValue({ id: routeA, archivedAt: new Date() });
    await expect(setCampaignRoutes(dependencies, createActor(), parse([{ routeId: routeA }]))).rejects.toMatchObject({ reason: "route_not_found" });
  });
});
