"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CampaignChanges, CampaignRouteInput, CreateCampaignInput } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { addCampaignProspects, createCampaign, removeCampaignProspects, setCampaignArchived, setCampaignRoutes, setCampaignStatus, updateCampaign } from "@/modules/campaigns/ui/campaigns-api";
import { campaignKeys } from "@/modules/campaigns/ui/use-campaign-queries";

/** Lists, details, members, suggestions and counts all move together, so they are refreshed as one, even after a failure. */
function useInvalidateCampaigns() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: campaignKeys.all });
}

export function useCreateCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({ mutationFn: (input: CreateCampaignInput) => createCampaign(input), onSettled: invalidate });
}

export type CampaignEdit = Readonly<{ campaignId: string; changes: CampaignChanges | null; routes: CampaignRouteInput[] | null }>;

/** Fields and routes are separate commands, so they run in turn; each is skipped when nothing changed. */
export function useUpdateCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: async ({ campaignId, changes, routes }: CampaignEdit) => {
      if (changes) await updateCampaign(campaignId, changes);
      if (routes) await setCampaignRoutes(campaignId, routes);
    },
    onSettled: invalidate
  });
}

export function useSetCampaignStatus() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({ mutationFn: ({ campaignId, status }: Readonly<{ campaignId: string; status: CampaignStatus }>) => setCampaignStatus(campaignId, status), onSettled: invalidate });
}

export function useSetCampaignArchived() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({ mutationFn: ({ campaignId, archive }: Readonly<{ campaignId: string; archive: boolean }>) => setCampaignArchived(campaignId, archive), onSettled: invalidate });
}

export function useAddCampaignProspects() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({ mutationFn: ({ campaignId, prospectIds }: Readonly<{ campaignId: string; prospectIds: string[] }>) => addCampaignProspects(campaignId, prospectIds), onSettled: invalidate });
}

export function useRemoveCampaignProspects() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({ mutationFn: ({ campaignId, prospectIds }: Readonly<{ campaignId: string; prospectIds: string[] }>) => removeCampaignProspects(campaignId, prospectIds), onSettled: invalidate });
}
