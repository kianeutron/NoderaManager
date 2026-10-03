import type { CampaignCommandsRepository } from "@/modules/campaigns/data/campaign-commands.repository";
import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { assertHasRoutes, assertNotFinished } from "@/modules/campaigns/domain/campaign-rules";
import type { SetCampaignRoutesInput } from "@/modules/campaigns/domain/campaign.schema";
import type { UpdateCampaignResult } from "@/modules/campaigns/domain/campaign.types";
import { requireRouting } from "@/modules/prospects/application/require-routing";
import type { RouteRepository } from "@/modules/routes/data/route.repository";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type SetCampaignRoutesDependencies = Readonly<{
  reads: Pick<CampaignRepository, "findCampaign" | "listCampaignRoutes">;
  routes: Pick<RouteRepository, "findRoute" | "findModule">;
  commands: Pick<CampaignCommandsRepository, "replaceRoutes">;
}>;

const keyOf = (routeId: string, routeModuleId: string | null) => `${routeId}:${routeModuleId ?? ""}`;

/**
 * Replaces the whole list of routes a campaign works, which makes the command idempotent. A running campaign must keep at
 * least one. Members who no longer match a route stay (they are history); only new additions are checked against it.
 */
export async function setCampaignRoutes({ reads, routes, commands }: SetCampaignRoutesDependencies, actor: AuthenticatedActor, input: SetCampaignRoutesInput): Promise<UpdateCampaignResult> {
  const campaign = await reads.findCampaign(input.campaignId);
  if (!campaign || campaign.archivedAt !== null) throw new ApplicationError("not_found", "Campaign not found");
  assertNotFinished(campaign.status);
  assertHasRoutes(campaign.status, input.routes.length);

  const drafts = input.routes.map((route) => ({ routeId: route.routeId, routeModuleId: route.routeModuleId ?? null }));
  for (const draft of drafts) await requireRouting(routes, draft.routeId, draft.routeModuleId);

  const current = await reads.listCampaignRoutes([campaign.id]);
  const currentKeys = new Set(current.map((route) => keyOf(route.routeId, route.moduleId)));
  if (currentKeys.size === drafts.length && drafts.every((draft) => currentKeys.has(keyOf(draft.routeId, draft.routeModuleId)))) return { campaignId: campaign.id, changed: false, auditEventId: null };

  const auditEventId = await commands.replaceRoutes(campaign.id, drafts, toAuditEvent(actor, {
    action: "campaign.routes_set",
    entityType: "campaign",
    entityId: campaign.id,
    summary: `Set ${drafts.length} route(s) on campaign "${campaign.name}"`,
    metadata: { before: current.length, after: drafts.length }
  }));

  return { campaignId: campaign.id, changed: true, auditEventId };
}
