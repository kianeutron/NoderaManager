import { createCampaignCommandsRepository } from "@/modules/campaigns/data/campaign-commands.repository";
import { createCampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { addCampaignProspects, listCampaignMembers, removeCampaignProspects, suggestCampaignProspects } from "@/modules/campaigns/application/campaign-members.service";
import { createCampaign } from "@/modules/campaigns/application/create-campaign.service";
import { getCampaign, searchCampaigns } from "@/modules/campaigns/application/search-campaigns.service";
import { archiveCampaign, restoreCampaign } from "@/modules/campaigns/application/set-campaign-archived.service";
import { setCampaignRoutes } from "@/modules/campaigns/application/set-campaign-routes.service";
import { setCampaignStatus } from "@/modules/campaigns/application/set-campaign-status.service";
import { updateCampaign } from "@/modules/campaigns/application/update-campaign.service";
import type { CampaignIdInput, CampaignMembersQuery, CampaignProspectsInput, CampaignSearchQuery, CampaignSuggestionsQuery, CreateCampaignInput, SetCampaignRoutesInput, SetCampaignStatusInput, UpdateCampaignInput } from "@/modules/campaigns/domain/campaign.schema";
import { createRouteRepository } from "@/modules/routes/data/route.repository";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createCampaignsServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const reads = createCampaignRepository(database);
  const commands = createCampaignCommandsRepository(database);
  const routes = createRouteRepository(database);

  return {
    searchCampaigns: (query: CampaignSearchQuery) => searchCampaigns(reads, query),
    getCampaign: (campaignId: string) => getCampaign(reads, campaignId),
    listCampaignProspects: (campaignId: string, query: CampaignMembersQuery) => listCampaignMembers(reads, campaignId, query),
    suggestCampaignProspects: (campaignId: string, query: CampaignSuggestionsQuery) => suggestCampaignProspects(reads, campaignId, query),
    createCampaign: (actor: AuthenticatedActor, input: CreateCampaignInput) => createCampaign({ reads, routes, commands }, actor, input),
    updateCampaign: (actor: AuthenticatedActor, input: UpdateCampaignInput) => updateCampaign({ reads, commands }, actor, input),
    setCampaignRoutes: (actor: AuthenticatedActor, input: SetCampaignRoutesInput) => setCampaignRoutes({ reads, routes, commands }, actor, input),
    setCampaignStatus: (actor: AuthenticatedActor, input: SetCampaignStatusInput) => setCampaignStatus({ reads, commands }, actor, input),
    archiveCampaign: (actor: AuthenticatedActor, input: CampaignIdInput) => archiveCampaign({ reads, commands }, actor, input),
    restoreCampaign: (actor: AuthenticatedActor, input: CampaignIdInput) => restoreCampaign({ reads, commands }, actor, input),
    addCampaignProspects: (actor: AuthenticatedActor, input: CampaignProspectsInput) => addCampaignProspects({ reads, commands }, actor, input),
    removeCampaignProspects: (actor: AuthenticatedActor, input: CampaignProspectsInput) => removeCampaignProspects({ reads, commands }, actor, input)
  };
}

export type CampaignsServices = ReturnType<typeof createCampaignsServices>;
