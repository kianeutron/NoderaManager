import { describe, expect, it, vi } from "vitest";
import { updateCampaign } from "@/modules/campaigns/application/update-campaign.service";
import { updateCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";
import { createActor } from "@/test/factories/actors";

const campaignId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const current = { id: campaignId, name: "Q4 agencies", goal: null, status: "draft", startsAt: new Date("2026-10-01T00:00:00Z"), endsAt: new Date("2026-12-01T00:00:00Z"), archivedAt: null, updatedAt: new Date(), targetingRules: { personas: ["recruiter"], countries: [], organizationTypes: [] } };

function createDependencies(found: Record<string, unknown> | null = current, sameName: Record<string, unknown> | null = null) {
  return { reads: { findCampaign: vi.fn().mockResolvedValue(found), findCampaignByNormalizedName: vi.fn().mockResolvedValue(sameName) }, commands: { updateCampaign: vi.fn().mockResolvedValue("audit-1") } };
}
const parse = (input: Record<string, unknown>) => updateCampaignInputSchema.parse({ campaignId, ...input });

describe("updateCampaign", () => {
  it("writes only what differs, keeps the goal out of the audit trail, and stores the normalized name", async () => {
    const dependencies = createDependencies();
    const result = await updateCampaign(dependencies, createActor(), parse({ name: "Q4 recruiters", goal: "Private aim", endsAt: "2026-12-01T00:00:00Z" }));

    expect(dependencies.commands.updateCampaign).toHaveBeenCalledWith(campaignId, { name: "Q4 recruiters", normalizedName: "q4 recruiters", goal: "Private aim" }, expect.objectContaining({ action: "campaign.updated" }));
    expect(JSON.stringify(dependencies.commands.updateCampaign.mock.calls[0]?.[2])).not.toContain("Private aim");
    expect(result).toEqual({ campaignId, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when nothing really changes, including the same rules in another spelling", async () => {
    const dependencies = createDependencies();
    await expect(updateCampaign(dependencies, createActor(), parse({ name: "Q4 agencies", targetingRules: { personas: ["recruiter", "recruiter"] } }))).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.updateCampaign).not.toHaveBeenCalled();
  });

  it("changes the targeting rules when they differ, and clears a date with null", async () => {
    const dependencies = createDependencies();
    await updateCampaign(dependencies, createActor(), parse({ targetingRules: { countries: ["de"] }, endsAt: null }));

    expect(dependencies.commands.updateCampaign).toHaveBeenCalledWith(campaignId, { targetingRules: { personas: [], countries: ["DE"], organizationTypes: [] }, endsAt: null }, expect.anything());
  });

  it("checks the window against the stored date when only one date is sent", async () => {
    await expect(updateCampaign(createDependencies(), createActor(), parse({ startsAt: "2027-01-01T00:00:00Z" }))).rejects.toMatchObject({ reason: "campaign_window_invalid" });
  });

  it("refuses a name another campaign has, but lets a campaign recase its own", async () => {
    await expect(updateCampaign(createDependencies(current, { id: "other" }), createActor(), parse({ name: "Taken" }))).rejects.toMatchObject({ reason: "campaign_name_taken" });
    await expect(updateCampaign(createDependencies(current, { id: campaignId }), createActor(), parse({ name: "q4 AGENCIES" }))).resolves.toMatchObject({ changed: true });
  });

  it("refuses a completed campaign, and treats an unknown or archived one as not found", async () => {
    await expect(updateCampaign(createDependencies({ ...current, status: "completed" }), createActor(), parse({ goal: "New" }))).rejects.toMatchObject({ reason: "campaign_finished" });
    await expect(updateCampaign(createDependencies(null), createActor(), parse({ goal: "New" }))).rejects.toMatchObject({ code: "not_found" });
    await expect(updateCampaign(createDependencies({ ...current, archivedAt: new Date() }), createActor(), parse({ goal: "New" }))).rejects.toMatchObject({ code: "not_found" });
  });
});
