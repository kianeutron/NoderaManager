import { describe, expect, it, vi } from "vitest";
import { getCampaign, searchCampaigns } from "@/modules/campaigns/application/search-campaigns.service";
import { campaignPagination, campaignSearchQuerySchema } from "@/modules/campaigns/domain/campaign.schema";

const row = (index: number) => ({ id: `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d${String(index).padStart(2, "0")}`, name: `Campaign ${index}`, goal: null, status: "active", startsAt: null, endsAt: null, archivedAt: null, updatedAt: new Date("2026-09-01T00:00:00Z"), sortKey: "2026-09-01 00:00:00+00" });

function createRepository(rows = [row(1)]) {
  return {
    searchCampaigns: vi.fn().mockResolvedValue(rows), countCampaigns: vi.fn().mockResolvedValue(rows.length),
    listCampaignRoutes: vi.fn().mockResolvedValue([{ campaignId: row(1).id, routeId: "r1", routeName: "Agencies", moduleId: null, moduleName: null }]),
    countMembersByCampaign: vi.fn().mockResolvedValue([{ campaignId: row(1).id, members: 5, contacted: 3, won: 1 }]),
    countMessagesByCampaign: vi.fn().mockResolvedValue([{ campaignId: row(1).id, messages: 9, replies: 2 }]),
    findCampaign: vi.fn()
  };
}

describe("searchCampaigns", () => {
  it("adds each campaign's routes and live counts, with zeros for one nothing is filed under", async () => {
    const repository = createRepository([row(1), row(2)]);
    const page = await searchCampaigns(repository, campaignSearchQuerySchema.parse({}));

    expect(page.items[0]).toMatchObject({ routes: [{ routeId: "r1", routeName: "Agencies", moduleId: null, moduleName: null }], stats: { members: 5, contacted: 3, won: 1, messages: 9, replies: 2 } });
    expect(page.items[1]).toMatchObject({ routes: [], stats: { members: 0, contacted: 0, won: 0, messages: 0, replies: 0 } });
    expect(repository.listCampaignRoutes).toHaveBeenCalledTimes(1);
    expect(page.items[0]).not.toHaveProperty("sortKey");
  });

  it("counts only on the first page and pages with a cursor", async () => {
    const repository = createRepository([row(1), row(2), row(3)]);
    const first = await searchCampaigns(repository, campaignSearchQuerySchema.parse({ limit: "2" }));
    expect(first.items).toHaveLength(2);
    expect(campaignPagination.decode(first.nextCursor as string)).toMatchObject({ sort: "updated", id: row(2).id });

    repository.countCampaigns.mockClear();
    expect((await searchCampaigns(repository, campaignSearchQuerySchema.parse({ limit: "2", cursor: first.nextCursor }))).total).toBeNull();
    expect(repository.countCampaigns).not.toHaveBeenCalled();
  });
});

describe("getCampaign", () => {
  it("returns the detail with its targeting rules read through the schema, even from an empty value", async () => {
    const repository = createRepository();
    repository.findCampaign.mockResolvedValue({ ...row(1), targetingRules: {} });

    expect(await getCampaign(repository, row(1).id)).toMatchObject({ name: "Campaign 1", targetingRules: { personas: [], countries: [], organizationTypes: [] }, stats: { members: 5 } });
  });

  it("returns null for an unknown campaign", async () => {
    const repository = createRepository();
    repository.findCampaign.mockResolvedValue(null);
    expect(await getCampaign(repository, row(1).id)).toBeNull();
  });
});
