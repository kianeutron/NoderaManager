import type { CampaignCommandsRepository } from "@/modules/campaigns/data/campaign-commands.repository";
import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import { matchesTargetingRules, assertNotFinished, routeMatchesCampaign } from "@/modules/campaigns/domain/campaign-rules";
import { memberPagination, targetingRulesSchema, type CampaignMembersQuery, type CampaignProspectsInput, type CampaignSuggestionsQuery } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignMemberPage, CampaignMembershipResult, CampaignSuggestion } from "@/modules/campaigns/domain/campaign.types";
import { toMember, toProspectView } from "@/modules/campaigns/application/campaign-views";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import { sliceKeysetPage } from "@/shared/api/keyset";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type CampaignReads = Pick<CampaignRepository, "findCampaign" | "listCampaignRoutes">;

async function requireEditableCampaign(reads: CampaignReads, campaignId: string) {
  const campaign = await reads.findCampaign(campaignId);
  if (!campaign || campaign.archivedAt !== null) throw new ApplicationError("not_found", "Campaign not found");
  assertNotFinished(campaign.status);
  return campaign;
}

/**
 * Adds prospects to a campaign. Each must exist, not be archived, and be on one of the campaign's routes (a campaign with
 * no routes yet takes any). Idempotent: prospects already in are left alone, and adding only those is a no-op.
 */
export async function addCampaignProspects({ reads, commands }: Readonly<{ reads: CampaignReads & Pick<CampaignRepository, "findProspectsForMembership" | "findMemberIds">; commands: Pick<CampaignCommandsRepository, "addMembers"> }>, actor: AuthenticatedActor, input: CampaignProspectsInput): Promise<CampaignMembershipResult> {
  const campaign = await requireEditableCampaign(reads, input.campaignId);

  const found = await reads.findProspectsForMembership(input.prospectIds);
  if (found.length !== input.prospectIds.length || found.some((prospect) => prospect.archivedAt !== null)) throw new ApplicationError("not_found", "One of those prospects was not found");

  const campaignRoutes = (await reads.listCampaignRoutes([campaign.id])).map((route) => ({ routeId: route.routeId, routeModuleId: route.moduleId }));
  if (found.some((prospect) => !routeMatchesCampaign({ routeId: prospect.routeId, routeModuleId: prospect.routeModuleId }, campaignRoutes))) throw new ApplicationError("conflict", "A prospect is on a route this campaign does not work.", "prospect_outside_campaign_routes");

  const already = new Set(await reads.findMemberIds(campaign.id, input.prospectIds));
  const additions = input.prospectIds.filter((prospectId) => !already.has(prospectId));
  if (additions.length === 0) return { campaignId: campaign.id, changed: 0, unchanged: already.size, auditEventId: null };

  const auditEventId = await commands.addMembers(campaign.id, additions, toAuditEvent(actor, {
    action: "campaign.prospects_added",
    entityType: "campaign",
    entityId: campaign.id,
    summary: `Added ${additions.length} prospect(s) to campaign "${campaign.name}"`,
    metadata: { prospectIds: additions }
  }));

  return { campaignId: campaign.id, changed: additions.length, unchanged: already.size, auditEventId };
}

/** Takes prospects out of a campaign. Only the link goes; the prospects and everything logged for them stay. Prospects that were not in it are ignored. */
export async function removeCampaignProspects({ reads, commands }: Readonly<{ reads: CampaignReads & Pick<CampaignRepository, "findMemberIds">; commands: Pick<CampaignCommandsRepository, "removeMembers"> }>, actor: AuthenticatedActor, input: CampaignProspectsInput): Promise<CampaignMembershipResult> {
  const campaign = await requireEditableCampaign(reads, input.campaignId);

  const members = await reads.findMemberIds(campaign.id, input.prospectIds);
  if (members.length === 0) return { campaignId: campaign.id, changed: 0, unchanged: input.prospectIds.length, auditEventId: null };

  const auditEventId = await commands.removeMembers(campaign.id, members, toAuditEvent(actor, {
    action: "campaign.prospects_removed",
    entityType: "campaign",
    entityId: campaign.id,
    summary: `Removed ${members.length} prospect(s) from campaign "${campaign.name}"`,
    metadata: { prospectIds: members }
  }));

  return { campaignId: campaign.id, changed: members.length, unchanged: input.prospectIds.length - members.length, auditEventId };
}

/** A campaign's prospects, most recently added first, paged with a cursor and counted once. */
export async function listCampaignMembers(reads: Pick<CampaignRepository, "findCampaign" | "listMembers" | "countMembers">, campaignId: string, query: CampaignMembersQuery): Promise<CampaignMemberPage> {
  const campaign = await reads.findCampaign(campaignId);
  if (!campaign) throw new ApplicationError("not_found", "Campaign not found");

  const { cursor: encodedCursor, limit, sort } = query;
  const cursor = memberPagination.requireCursor(encodedCursor);
  const [fetchedRows, total] = await Promise.all([reads.listMembers(campaign.id, { sort, limit, ...(cursor ? { cursor } : {}) }), cursor ? null : reads.countMembers(campaign.id)]);

  const { rows, nextCursor } = sliceKeysetPage(fetchedRows, limit, (lastRow) => memberPagination.encode({ sort, key: lastRow.sortKey, id: lastRow.membershipId }));
  return { items: rows.map(toMember), total, nextCursor };
}

/**
 * Prospects that could join, best fit first. Advisory only: nothing is added by rule. A prospect that matches the targeting
 * rules comes before one that only works a route of the campaign. A finished campaign suggests nothing.
 */
export async function suggestCampaignProspects(reads: CampaignReads & Pick<CampaignRepository, "listSuggestionCandidates">, campaignId: string, { q, limit }: CampaignSuggestionsQuery): Promise<CampaignSuggestion[]> {
  const campaign = await reads.findCampaign(campaignId);
  if (!campaign || campaign.archivedAt !== null) throw new ApplicationError("not_found", "Campaign not found");
  if (campaign.status === "completed") return [];

  const rules = targetingRulesSchema.parse(campaign.targetingRules);
  const routeEntries = (await reads.listCampaignRoutes([campaign.id])).map((route) => ({ routeId: route.routeId, routeModuleId: route.moduleId }));
  const candidates = await reads.listSuggestionCandidates({ campaignId: campaign.id, routeEntries, q });

  const suggestions = candidates.map((candidate) => ({
    ...toProspectView(candidate),
    matchesRules: matchesTargetingRules(rules, { persona: candidate.persona, countryCodes: [candidate.personCountry, candidate.organizationCountry], organizationType: candidate.organizationType })
  }));
  return [...suggestions.filter((suggestion) => suggestion.matchesRules), ...suggestions.filter((suggestion) => !suggestion.matchesRules)].slice(0, limit);
}
