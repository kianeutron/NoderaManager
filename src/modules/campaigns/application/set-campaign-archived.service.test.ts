import { describe, expect, it, vi } from "vitest";
import { archiveCampaign, restoreCampaign } from "@/modules/campaigns/application/set-campaign-archived.service";
import { createActor } from "@/test/factories/actors";

const campaignId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const archivedAt = new Date("2026-09-01T00:00:00Z");

function createDependencies(found: Record<string, unknown> | null) {
  return { reads: { findCampaign: vi.fn().mockResolvedValue(found) }, commands: { setArchived: vi.fn().mockResolvedValue("audit-1") } };
}

describe("campaign archiving", () => {
  it("archives a paused campaign and restores an archived one, each audited", async () => {
    const archiving = createDependencies({ id: campaignId, name: "Q4", status: "paused", archivedAt: null });
    expect(await archiveCampaign(archiving, createActor(), { campaignId })).toEqual({ campaignId, archived: true, changed: true, auditEventId: "audit-1" });
    expect(archiving.commands.setArchived).toHaveBeenCalledWith(campaignId, expect.any(Date), expect.objectContaining({ action: "campaign.archived" }));

    const restoring = createDependencies({ id: campaignId, name: "Q4", status: "completed", archivedAt });
    await restoreCampaign(restoring, createActor(), { campaignId });
    expect(restoring.commands.setArchived).toHaveBeenCalledWith(campaignId, null, expect.objectContaining({ action: "campaign.restored" }));
  });

  it("refuses to archive a running campaign, but restoring is never blocked by status", async () => {
    await expect(archiveCampaign(createDependencies({ id: campaignId, name: "Q4", status: "active", archivedAt: null }), createActor(), { campaignId })).rejects.toMatchObject({ reason: "campaign_running" });
    await expect(restoreCampaign(createDependencies({ id: campaignId, name: "Q4", status: "active", archivedAt }), createActor(), { campaignId })).resolves.toMatchObject({ changed: true });
  });

  it("is a no-op in the state it is already in, and reports an unknown campaign", async () => {
    const already = createDependencies({ id: campaignId, name: "Q4", status: "paused", archivedAt });
    await expect(archiveCampaign(already, createActor(), { campaignId })).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(already.commands.setArchived).not.toHaveBeenCalled();
    await expect(restoreCampaign(createDependencies({ id: campaignId, name: "Q4", status: "paused", archivedAt: null }), createActor(), { campaignId })).resolves.toMatchObject({ changed: false });
    await expect(archiveCampaign(createDependencies(null), createActor(), { campaignId })).rejects.toMatchObject({ code: "not_found" });
  });
});
