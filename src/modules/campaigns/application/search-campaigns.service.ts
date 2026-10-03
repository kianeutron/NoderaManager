import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { campaignPagination, type CampaignSearchQuery } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignDetail, CampaignPage } from "@/modules/campaigns/domain/campaign.types";
import { toCampaignDetail, toCampaignSummaries } from "@/modules/campaigns/application/campaign-views";
import { sliceKeysetPage } from "@/shared/api/keyset";

type SearchCampaignsRepository = Pick<CampaignRepository, "searchCampaigns" | "countCampaigns" | "listCampaignRoutes" | "countMembersByCampaign" | "countMessagesByCampaign">;

export async function searchCampaigns(repository: SearchCampaignsRepository, query: CampaignSearchQuery): Promise<CampaignPage> {
  const { cursor: encodedCursor, limit, sort, ...filters } = query;
  const cursor = campaignPagination.requireCursor(encodedCursor);

  // The total never changes while paging through one filter set, so only the first page pays for counting.
  const [fetchedRows, total] = await Promise.all([
    repository.searchCampaigns({ ...filters, sort, limit, ...(cursor ? { cursor } : {}) }),
    cursor ? null : repository.countCampaigns(filters)
  ]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, limit, (lastRow) => campaignPagination.encode({ sort, key: lastRow.sortKey, id: lastRow.id }));
  return { items: await toCampaignSummaries(repository, rows), total, nextCursor };
}

export async function getCampaign(repository: Pick<CampaignRepository, "findCampaign" | "listCampaignRoutes" | "countMembersByCampaign" | "countMessagesByCampaign">, campaignId: string): Promise<CampaignDetail | null> {
  const row = await repository.findCampaign(campaignId);
  return row ? toCampaignDetail(repository, row) : null;
}
