import { v7 as uuidv7 } from "uuid";
import type { CampaignCommandsRepository } from "@/modules/campaigns/data/campaign-commands.repository";
import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import type { CreateCampaignInput } from "@/modules/campaigns/domain/campaign.schema";
import type { CreateCampaignResult } from "@/modules/campaigns/domain/campaign.types";
import { requireRouting } from "@/modules/prospects/application/require-routing";
import type { RouteRepository } from "@/modules/routes/data/route.repository";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { normalizeText } from "@/shared/lib/normalize-text";

type CreateCampaignDependencies = Readonly<{
  reads: Pick<CampaignRepository, "findCampaignByNormalizedName">;
  routes: Pick<RouteRepository, "findRoute" | "findModule">;
  commands: Pick<CampaignCommandsRepository, "insertCampaign">;
}>;

/**
 * Starts a campaign as a draft. Idempotent on the name (ignoring case): asking again returns the existing campaign. A name
 * that belongs to an archived campaign is refused, so archiving never makes a name look free. Every route must be usable.
 */
export async function createCampaign({ reads, routes, commands }: CreateCampaignDependencies, actor: AuthenticatedActor, input: CreateCampaignInput): Promise<CreateCampaignResult> {
  const normalizedName = normalizeText(input.name);
  const existing = await reads.findCampaignByNormalizedName(normalizedName);
  if (existing) {
    if (existing.archivedAt !== null) throw new ApplicationError("conflict", `A campaign named "${input.name}" exists but is archived.`, "campaign_name_taken");
    return { campaignId: existing.id, created: false, auditEventId: null };
  }

  for (const route of input.routes) await requireRouting(routes, route.routeId, route.routeModuleId ?? null);

  const campaignId = uuidv7();
  const auditEventId = await commands.insertCampaign({
    campaignId,
    name: input.name,
    normalizedName,
    goal: input.goal ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    targetingRules: input.targetingRules,
    routes: input.routes.map((route) => ({ routeId: route.routeId, routeModuleId: route.routeModuleId ?? null })),
    // The goal is the owner's own note, so it stays out of the audit trail like other free text.
    audit: toAuditEvent(actor, {
      action: "campaign.created",
      entityType: "campaign",
      entityId: campaignId,
      summary: `Created campaign "${input.name}"`,
      metadata: { routeCount: input.routes.length, startsAt: input.startsAt?.toISOString() ?? null, endsAt: input.endsAt?.toISOString() ?? null }
    })
  });

  return { campaignId, created: true, auditEventId };
}
