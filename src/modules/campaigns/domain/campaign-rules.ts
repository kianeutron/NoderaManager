import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import type { TargetingRules } from "@/modules/campaigns/domain/campaign.schema";
import { ApplicationError } from "@/shared/errors/application-error";

/**
 * Where a campaign can go. A draft is started, a running one can pause and resume, and either can be completed.
 * Completed is the end: a finished campaign is a record of what was tried.
 */
const transitions = {
  draft: ["active"],
  active: ["paused", "completed"],
  paused: ["active", "completed"],
  completed: []
} as const satisfies Record<CampaignStatus, readonly CampaignStatus[]>;

export function assertTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (!(transitions[from] as readonly CampaignStatus[]).includes(to)) throw new ApplicationError("conflict", `A ${from} campaign cannot become ${to}.`, "campaign_transition_invalid");
}

/** A campaign with no route has nothing to work, so it cannot run (or keep running) without one. A draft may still be empty. */
export function assertHasRoutes(status: CampaignStatus, routeCount: number): void {
  if ((status === "active" || status === "paused") && routeCount === 0) throw new ApplicationError("conflict", "Add at least one route before starting this campaign.", "campaign_needs_route");
}

/** A campaign that is running is not hidden: pause or complete it first. */
export function assertNotRunning(status: CampaignStatus): void {
  if (status === "active") throw new ApplicationError("conflict", "Pause or complete the campaign before archiving it.", "campaign_running");
}

/** Everything about a finished campaign is fixed. */
export function assertNotFinished(status: CampaignStatus): void {
  if (status === "completed") throw new ApplicationError("conflict", "This campaign is completed and can no longer change.", "campaign_finished");
}

type RouteEntry = Readonly<{ routeId: string; routeModuleId: string | null }>;

/**
 * Whether a prospect's route is one the campaign works: an entry for a whole route covers every module of it, an entry for
 * a module covers only that module. A campaign with no routes yet does not restrict anything.
 */
export function routeMatchesCampaign(prospect: RouteEntry, campaignRoutes: readonly RouteEntry[]): boolean {
  if (campaignRoutes.length === 0) return true;
  return campaignRoutes.some((entry) => entry.routeId === prospect.routeId && (entry.routeModuleId === null || entry.routeModuleId === prospect.routeModuleId));
}

type Targetable = Readonly<{ persona: string | null; countryCodes: readonly (string | null)[]; organizationType: string | null }>;

/** Does a prospect fit the rules? Each non-empty list must match; the person's or the company's country may match. */
export function matchesTargetingRules(rules: TargetingRules, { persona, countryCodes, organizationType }: Targetable): boolean {
  if (rules.personas.length > 0 && !(persona && (rules.personas as readonly string[]).includes(persona))) return false;
  if (rules.countries.length > 0 && !countryCodes.some((code) => code !== null && rules.countries.includes(code))) return false;
  if (rules.organizationTypes.length > 0 && !(organizationType && (rules.organizationTypes as readonly string[]).includes(organizationType))) return false;
  return true;
}
