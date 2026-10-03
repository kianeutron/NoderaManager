import type { KeysetPage } from "@/shared/api/keyset";
import type { campaignStatusValues, prospectStatusValues } from "@/shared/db/schema/crm-values";
import type { TargetingRules } from "@/modules/campaigns/domain/campaign.schema";

export type CampaignStatus = (typeof campaignStatusValues)[number];
type ProspectStatus = (typeof prospectStatusValues)[number];

/** A route (or one of its modules) a campaign works. A null module means the whole route. */
export type CampaignRouteView = Readonly<{ routeId: string; routeName: string; moduleId: string | null; moduleName: string | null }>;

/** What a campaign has produced so far, counted live. A reply means a real one, not an auto-reply. */
export type CampaignStats = Readonly<{ members: number; contacted: number; won: number; messages: number; replies: number }>;

export type CampaignSummary = Readonly<{
  id: string;
  name: string;
  status: CampaignStatus;
  goal: string | null;
  startsAt: string | null;
  endsAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
  routes: readonly CampaignRouteView[];
  stats: CampaignStats;
}>;

export type CampaignPage = KeysetPage<CampaignSummary>;

export type CampaignDetail = CampaignSummary & Readonly<{ targetingRules: TargetingRules }>;

/** A prospect in or near a campaign, with enough to recognise it. */
export type CampaignProspectView = Readonly<{
  prospectId: string;
  status: ProspectStatus;
  person: Readonly<{ id: string; fullName: string }> | null;
  organization: Readonly<{ id: string; name: string }> | null;
  routeName: string;
  moduleName: string | null;
  lastContactedAt: string | null;
}>;

/** `id` is the membership itself, which is what pages are ordered and de-duplicated by. */
export type CampaignMember = CampaignProspectView & Readonly<{ id: string; addedAt: string }>;
export type CampaignMemberPage = KeysetPage<CampaignMember>;

/** A prospect that could join. `matchesRules` says whether it fits the campaign's targeting rules; matching ones come first. */
export type CampaignSuggestion = CampaignProspectView & Readonly<{ matchesRules: boolean }>;

type Audited = Readonly<{ auditEventId: string | null }>;

/** `created: false` means a campaign with that name already existed and was returned unchanged. */
export type CreateCampaignResult = Audited & Readonly<{ campaignId: string; created: boolean }>;
export type UpdateCampaignResult = Audited & Readonly<{ campaignId: string; changed: boolean }>;
export type SetCampaignStatusResult = Audited & Readonly<{ campaignId: string; status: CampaignStatus; previousStatus: CampaignStatus; changed: boolean }>;
export type ArchiveCampaignResult = Audited & Readonly<{ campaignId: string; archived: boolean; changed: boolean }>;
export type CampaignMembershipResult = Audited & Readonly<{ campaignId: string; changed: number; unchanged: number }>;
