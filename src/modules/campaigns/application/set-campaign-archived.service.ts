import type { CampaignCommandsRepository } from "@/modules/campaigns/data/campaign-commands.repository";
import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { assertNotRunning } from "@/modules/campaigns/domain/campaign-rules";
import type { CampaignIdInput } from "@/modules/campaigns/domain/campaign.schema";
import type { ArchiveCampaignResult } from "@/modules/campaigns/domain/campaign.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type SetCampaignArchivedDependencies = Readonly<{
  reads: Pick<CampaignRepository, "findCampaign">;
  commands: Pick<CampaignCommandsRepository, "setArchived">;
}>;

async function setArchived({ reads, commands }: SetCampaignArchivedDependencies, actor: AuthenticatedActor, input: CampaignIdInput, archive: boolean): Promise<ArchiveCampaignResult> {
  const campaign = await reads.findCampaign(input.campaignId);
  if (!campaign) throw new ApplicationError("not_found", "Campaign not found");
  if ((campaign.archivedAt !== null) === archive) return { campaignId: campaign.id, archived: archive, changed: false, auditEventId: null };
  if (archive) assertNotRunning(campaign.status);

  const auditEventId = await commands.setArchived(campaign.id, archive ? new Date() : null, toAuditEvent(actor, {
    action: archive ? "campaign.archived" : "campaign.restored",
    entityType: "campaign",
    entityId: campaign.id,
    summary: `${archive ? "Archived" : "Restored"} campaign "${campaign.name}"`,
    metadata: {}
  }));

  return { campaignId: campaign.id, archived: archive, changed: true, auditEventId };
}

/** Hides a campaign from lists; its members, messages and history stay, and it can be restored. A running campaign must be paused or completed first. Idempotent. */
export const archiveCampaign = (dependencies: SetCampaignArchivedDependencies, actor: AuthenticatedActor, input: CampaignIdInput) => setArchived(dependencies, actor, input, true);
export const restoreCampaign = (dependencies: SetCampaignArchivedDependencies, actor: AuthenticatedActor, input: CampaignIdInput) => setArchived(dependencies, actor, input, false);
