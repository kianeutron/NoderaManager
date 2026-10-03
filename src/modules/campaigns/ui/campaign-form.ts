import type { CampaignRouteInput, TargetingRules } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignDetail, CampaignRouteView } from "@/modules/campaigns/domain/campaign.types";
import type { RouteView } from "@/modules/routes/domain/route.types";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/shared/lib/format-date";
import { blankToUndefined, definedEntries, diffText } from "@/shared/ui/form/form-values";

export type CampaignFormValues = Readonly<{
  name: string;
  goal: string;
  /** A `datetime-local` value (local time, to the minute). Empty means no date. */
  startsAt: string;
  endsAt: string;
  personas: TargetingRules["personas"];
  /** ISO country codes, typed one at a time. */
  countries: string[];
  organizationTypes: TargetingRules["organizationTypes"];
  /** Route and module choices as `routeKey`s. */
  routes: string[];
}>;

export const emptyCampaignForm: CampaignFormValues = { name: "", goal: "", startsAt: "", endsAt: "", personas: [], countries: [], organizationTypes: [], routes: [] };

/** One choice per route, and one per module of it. A route alone covers every module; a module narrows to that one. */
export const routeKey = (routeId: string, moduleId: string | null): string => (moduleId ? `${routeId}:${moduleId}` : routeId);

export type RouteChoice = Readonly<{ value: string; label: string }>;

export function toRouteChoices(catalog: readonly RouteView[]): RouteChoice[] {
  return catalog.flatMap((route) => [{ value: route.id, label: route.name }, ...route.modules.map((routeModule) => ({ value: routeKey(route.id, routeModule.id), label: `${route.name} · ${routeModule.name}` }))]);
}

/** What a campaign already works, as choices, so one whose route was since archived still shows its name in the form. */
export function routeChoicesOf(routes: readonly CampaignRouteView[]): RouteChoice[] {
  return routes.map((route) => ({ value: routeKey(route.routeId, route.moduleId), label: route.moduleName ? `${route.routeName} · ${route.moduleName}` : route.routeName }));
}

export const mergeChoices = (primary: readonly RouteChoice[], extra: readonly RouteChoice[]): RouteChoice[] => [...primary, ...extra.filter((choice) => !primary.some((existing) => existing.value === choice.value))];

export function toRouteEntries(keys: readonly string[]): CampaignRouteInput[] {
  return keys.map((key) => {
    const [routeId = "", routeModuleId] = key.split(":");
    return routeModuleId ? { routeId, routeModuleId } : { routeId };
  });
}

export function campaignToFormValues(campaign: CampaignDetail): CampaignFormValues {
  return {
    name: campaign.name,
    goal: campaign.goal ?? "",
    startsAt: campaign.startsAt ? toDateTimeLocalValue(new Date(campaign.startsAt)) : "",
    endsAt: campaign.endsAt ? toDateTimeLocalValue(new Date(campaign.endsAt)) : "",
    personas: campaign.targetingRules.personas,
    countries: campaign.targetingRules.countries,
    organizationTypes: campaign.targetingRules.organizationTypes,
    routes: campaign.routes.map((route) => routeKey(route.routeId, route.moduleId))
  };
}

const rulesOf = (values: CampaignFormValues) => ({ personas: values.personas, countries: values.countries, organizationTypes: values.organizationTypes });

export function toCreateCampaignInput(values: CampaignFormValues): Record<string, unknown> {
  return definedEntries({
    name: values.name,
    goal: blankToUndefined(values.goal),
    startsAt: fromDateTimeLocalValue(values.startsAt),
    endsAt: fromDateTimeLocalValue(values.endsAt),
    targetingRules: rulesOf(values),
    routes: toRouteEntries(values.routes)
  });
}

const sameList = (left: readonly string[], right: readonly string[]) => left.length === right.length && left.every((item, index) => item === right[index]);

/** Only what differs from the saved campaign; `null` clears the goal or a date. Routes have their own command. Compared at the form's own precision (the minute). */
export function toCampaignChanges(values: CampaignFormValues, initial: CampaignFormValues): Record<string, unknown> {
  const rulesChanged = !sameList(values.personas, initial.personas) || !sameList(values.countries, initial.countries) || !sameList(values.organizationTypes, initial.organizationTypes);
  return definedEntries({
    name: values.name.trim() === initial.name ? undefined : values.name,
    goal: diffText(values.goal, initial.goal),
    startsAt: values.startsAt === initial.startsAt ? undefined : fromDateTimeLocalValue(values.startsAt) ?? null,
    endsAt: values.endsAt === initial.endsAt ? undefined : fromDateTimeLocalValue(values.endsAt) ?? null,
    targetingRules: rulesChanged ? rulesOf(values) : undefined
  });
}

/** The list of routes, or null when it is the same set as before. */
export function toRoutesChange(values: CampaignFormValues, initial: CampaignFormValues): CampaignRouteInput[] | null {
  const before = new Set(initial.routes);
  return values.routes.length === before.size && values.routes.every((key) => before.has(key)) ? null : toRouteEntries(values.routes);
}

/**
 * What the form validates on an edit: the changed fields, plus both dates in full, so the window rule is checked against
 * what the person sees and not only against what they touched. (Save stays disabled until something changed.)
 */
export function toCampaignEditValidationInput(values: CampaignFormValues, initial: CampaignFormValues): Record<string, unknown> {
  return { ...toCampaignChanges(values, initial), startsAt: fromDateTimeLocalValue(values.startsAt) ?? null, endsAt: fromDateTimeLocalValue(values.endsAt) ?? null };
}
