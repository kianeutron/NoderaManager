import type { CampaignCommandsRepository, CampaignPatch } from "@/modules/campaigns/data/campaign-commands.repository";
import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { assertNotFinished } from "@/modules/campaigns/domain/campaign-rules";
import { targetingRulesSchema, type UpdateCampaignInput } from "@/modules/campaigns/domain/campaign.schema";
import type { UpdateCampaignResult } from "@/modules/campaigns/domain/campaign.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import { toChangeMetadata } from "@/shared/audit/change-metadata";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { normalizeText } from "@/shared/lib/normalize-text";

type UpdateCampaignDependencies = Readonly<{
  reads: Pick<CampaignRepository, "findCampaign" | "findCampaignByNormalizedName">;
  commands: Pick<CampaignCommandsRepository, "updateCampaign">;
}>;

const sameInstant = (left: Date | null, right: Date | null) => (left?.getTime() ?? null) === (right?.getTime() ?? null);

/**
 * Changes a campaign's name, goal, window or targeting rules. Only real differences are written and audited. A campaign
 * that is completed, or archived, cannot change. Routes and status have their own commands.
 */
export async function updateCampaign({ reads, commands }: UpdateCampaignDependencies, actor: AuthenticatedActor, input: UpdateCampaignInput): Promise<UpdateCampaignResult> {
  const current = await reads.findCampaign(input.campaignId);
  if (!current || current.archivedAt !== null) throw new ApplicationError("not_found", "Campaign not found");
  assertNotFinished(current.status);

  const currentRules = targetingRulesSchema.parse(current.targetingRules);
  const patch: { -readonly [Field in keyof CampaignPatch]: CampaignPatch[Field] } = {};
  if (input.name !== undefined && input.name !== current.name) patch.name = input.name;
  if (input.goal !== undefined && input.goal !== current.goal) patch.goal = input.goal;
  if (input.startsAt !== undefined && !sameInstant(input.startsAt, current.startsAt)) patch.startsAt = input.startsAt;
  if (input.endsAt !== undefined && !sameInstant(input.endsAt, current.endsAt)) patch.endsAt = input.endsAt;
  if (input.targetingRules !== undefined && JSON.stringify(input.targetingRules) !== JSON.stringify(currentRules)) patch.targetingRules = input.targetingRules;
  if (Object.keys(patch).length === 0) return { campaignId: current.id, changed: false, auditEventId: null };

  const startsAt = patch.startsAt !== undefined ? patch.startsAt : current.startsAt;
  const endsAt = patch.endsAt !== undefined ? patch.endsAt : current.endsAt;
  if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) throw new ApplicationError("conflict", "The end cannot be before the start.", "campaign_window_invalid");

  if (patch.name !== undefined) {
    const normalizedName = normalizeText(patch.name);
    const taken = await reads.findCampaignByNormalizedName(normalizedName);
    if (taken && taken.id !== current.id) throw new ApplicationError("conflict", `A campaign named "${patch.name}" already exists.`, "campaign_name_taken");
    patch.normalizedName = normalizedName;
  }

  const { normalizedName: _normalizedName, ...changes } = patch;
  const auditEventId = await commands.updateCampaign(current.id, patch, toAuditEvent(actor, {
    action: "campaign.updated",
    entityType: "campaign",
    entityId: current.id,
    summary: `Updated ${Object.keys(changes).join(", ")} of campaign "${current.name}"`,
    metadata: toChangeMetadata(current, changes, ["goal"])
  }));

  return { campaignId: current.id, changed: true, auditEventId };
}
