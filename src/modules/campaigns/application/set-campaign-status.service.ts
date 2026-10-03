import type { CampaignCommandsRepository } from "@/modules/campaigns/data/campaign-commands.repository";
import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { assertHasRoutes, assertTransition } from "@/modules/campaigns/domain/campaign-rules";
import type { SetCampaignStatusInput } from "@/modules/campaigns/domain/campaign.schema";
import type { SetCampaignStatusResult } from "@/modules/campaigns/domain/campaign.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type SetCampaignStatusDependencies = Readonly<{
  reads: Pick<CampaignRepository, "findCampaign" | "listCampaignRoutes">;
  commands: Pick<CampaignCommandsRepository, "setStatus">;
}>;

/** Moves a campaign along draft, active, paused, completed (`assertTransition` says where). Starting needs a route. Asking for the status it already has is a no-op. */
export async function setCampaignStatus({ reads, commands }: SetCampaignStatusDependencies, actor: AuthenticatedActor, input: SetCampaignStatusInput): Promise<SetCampaignStatusResult> {
  const campaign = await reads.findCampaign(input.campaignId);
  if (!campaign || campaign.archivedAt !== null) throw new ApplicationError("not_found", "Campaign not found");
  if (campaign.status === input.status) return { campaignId: campaign.id, status: campaign.status, previousStatus: campaign.status, changed: false, auditEventId: null };

  assertTransition(campaign.status, input.status);
  assertHasRoutes(input.status, (await reads.listCampaignRoutes([campaign.id])).length);

  const auditEventId = await commands.setStatus(campaign.id, input.status, toAuditEvent(actor, {
    action: "campaign.status_changed",
    entityType: "campaign",
    entityId: campaign.id,
    summary: `Campaign "${campaign.name}" ${campaign.status} to ${input.status}`,
    metadata: { from: campaign.status, to: input.status }
  }));

  return { campaignId: campaign.id, status: input.status, previousStatus: campaign.status, changed: true, auditEventId };
}
