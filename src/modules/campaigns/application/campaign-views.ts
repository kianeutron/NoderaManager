import type { CampaignRepository } from "@/modules/campaigns/data/campaign.repository";
import type { CampaignDetail, CampaignMember, CampaignProspectView, CampaignStats, CampaignSummary } from "@/modules/campaigns/domain/campaign.types";
import { targetingRulesSchema } from "@/modules/campaigns/domain/campaign.schema";

type CampaignRow = Pick<NonNullable<Awaited<ReturnType<CampaignRepository["findCampaign"]>>>, "id" | "name" | "goal" | "status" | "startsAt" | "endsAt" | "archivedAt" | "updatedAt">;
type SummaryReads = Pick<CampaignRepository, "listCampaignRoutes" | "countMembersByCampaign" | "countMessagesByCampaign">;
type ProspectRow = Awaited<ReturnType<CampaignRepository["listMembers"]>>[number];

const noStats: CampaignStats = { members: 0, contacted: 0, won: 0, messages: 0, replies: 0 };
const iso = (date: Date | null): string | null => date?.toISOString() ?? null;

/** Campaigns with the routes they work and what they have produced, in three reads however many campaigns there are. */
export async function toCampaignSummaries(reads: SummaryReads, rows: readonly CampaignRow[]): Promise<CampaignSummary[]> {
  const ids = rows.map((row) => row.id);
  const [routeRows, memberRows, messageRows] = await Promise.all([reads.listCampaignRoutes(ids), reads.countMembersByCampaign(ids), reads.countMessagesByCampaign(ids)]);
  const routesByCampaign = Map.groupBy(routeRows, (route) => route.campaignId);
  const membersByCampaign = new Map(memberRows.map((row) => [row.campaignId, row]));
  const messagesByCampaign = new Map(messageRows.flatMap((row) => (row.campaignId ? [[row.campaignId, row] as const] : [])));

  return rows.map((row) => {
    const members = membersByCampaign.get(row.id);
    const messages = messagesByCampaign.get(row.id);
    const stats: CampaignStats = { ...noStats, ...(members ? { members: members.members, contacted: members.contacted, won: members.won } : {}), ...(messages ? { messages: messages.messages, replies: messages.replies } : {}) };
    return {
      id: row.id, name: row.name, status: row.status, goal: row.goal, startsAt: iso(row.startsAt), endsAt: iso(row.endsAt), archivedAt: iso(row.archivedAt), updatedAt: row.updatedAt.toISOString(),
      routes: (routesByCampaign.get(row.id) ?? []).map(({ routeId, routeName, moduleId, moduleName }) => ({ routeId, routeName, moduleId, moduleName })),
      stats
    };
  });
}

export async function toCampaignDetail(reads: SummaryReads, row: CampaignRow & Readonly<{ targetingRules: unknown }>): Promise<CampaignDetail> {
  const [summary] = await toCampaignSummaries(reads, [row]);
  // The column is free-form JSON; it is read through the same schema that wrote it, so an old or empty value still yields a valid shape.
  return { ...(summary as CampaignSummary), targetingRules: targetingRulesSchema.parse(row.targetingRules) };
}

type ProspectViewRow = Pick<ProspectRow, "prospectId" | "status" | "lastContactedAt" | "routeName" | "moduleName" | "personId" | "personName" | "organizationId" | "organizationName">;

export function toProspectView(row: ProspectViewRow): CampaignProspectView {
  return {
    prospectId: row.prospectId, status: row.status, routeName: row.routeName, moduleName: row.moduleName, lastContactedAt: iso(row.lastContactedAt),
    person: row.personId && row.personName ? { id: row.personId, fullName: row.personName } : null,
    organization: row.organizationId && row.organizationName ? { id: row.organizationId, name: row.organizationName } : null
  };
}

export const toMember = (row: ProspectRow): CampaignMember => ({ id: row.membershipId, ...toProspectView(row), addedAt: row.addedAt.toISOString() });
