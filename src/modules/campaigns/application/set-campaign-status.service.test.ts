import { describe, expect, it, vi } from "vitest";
import { setCampaignStatus } from "@/modules/campaigns/application/set-campaign-status.service";
import { createActor } from "@/test/factories/actors";

const campaignId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createDependencies(status: string | null, routeCount = 1, archivedAt: Date | null = null) {
  return {
    reads: { findCampaign: vi.fn().mockResolvedValue(status ? { id: campaignId, name: "Q4", status, archivedAt } : null), listCampaignRoutes: vi.fn().mockResolvedValue(Array.from({ length: routeCount }, (_, index) => ({ routeId: `r${index}`, moduleId: null }))) },
    commands: { setStatus: vi.fn().mockResolvedValue("audit-1") }
  };
}

describe("setCampaignStatus", () => {
  it("starts a draft that has a route, and audits the change", async () => {
    const dependencies = createDependencies("draft");
    const result = await setCampaignStatus(dependencies, createActor(), { campaignId, status: "active" });

    expect(dependencies.commands.setStatus).toHaveBeenCalledWith(campaignId, "active", expect.objectContaining({ action: "campaign.status_changed", metadata: { from: "draft", to: "active" } }));
    expect(result).toEqual({ campaignId, status: "active", previousStatus: "draft", changed: true, auditEventId: "audit-1" });
  });

  it("will not start a campaign with no route", async () => {
    const dependencies = createDependencies("draft", 0);
    await expect(setCampaignStatus(dependencies, createActor(), { campaignId, status: "active" })).rejects.toMatchObject({ reason: "campaign_needs_route" });
    expect(dependencies.commands.setStatus).not.toHaveBeenCalled();
  });

  it("follows the lifecycle: pause, resume, complete; nothing out of completed, nothing skipping ahead", async () => {
    for (const [from, to] of [["active", "paused"], ["paused", "active"], ["active", "completed"], ["paused", "completed"]] as const) {
      await expect(setCampaignStatus(createDependencies(from), createActor(), { campaignId, status: to })).resolves.toMatchObject({ changed: true });
    }
    for (const [from, to] of [["draft", "completed"], ["draft", "paused"], ["completed", "active"], ["active", "draft"]] as const) {
      await expect(setCampaignStatus(createDependencies(from), createActor(), { campaignId, status: to })).rejects.toMatchObject({ reason: "campaign_transition_invalid" });
    }
  });

  it("is a no-op for the status it already has, even a finished one, and reports an unknown or archived campaign", async () => {
    const dependencies = createDependencies("completed");
    await expect(setCampaignStatus(dependencies, createActor(), { campaignId, status: "completed" })).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.setStatus).not.toHaveBeenCalled();
    await expect(setCampaignStatus(createDependencies(null), createActor(), { campaignId, status: "active" })).rejects.toMatchObject({ code: "not_found" });
    await expect(setCampaignStatus(createDependencies("draft", 1, new Date()), createActor(), { campaignId, status: "active" })).rejects.toMatchObject({ code: "not_found" });
  });
});
