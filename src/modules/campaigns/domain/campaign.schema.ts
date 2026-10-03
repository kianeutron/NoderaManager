import { z } from "zod";
import { createKeysetPagination } from "@/shared/api/keyset";
import { displayNameSchema, isoCountryCodeSchema, isoTimestampSchema, optionalTextSchema, recordScopeSchema } from "@/shared/api/field-schemas";
import { campaignStatusValues, organizationTypeValues, personaValues } from "@/shared/db/schema/crm-values";

const statusSchema = z.enum(campaignStatusValues);
const unique = <Item>(items: Item[]): Item[] => [...new Set(items)];

export const maxCampaignRoutes = 20;
export const maxProspectsPerRequest = 50;

/**
 * Who a campaign is for. It only **suggests** prospects to add (docs: nothing is added by rule), so every list is a
 * filter: empty means "anyone". Lists combine with AND; values inside a list combine with OR.
 */
export const targetingRulesSchema = z.strictObject({
  personas: z.array(z.enum(personaValues)).max(personaValues.length).transform(unique).default([]),
  countries: z.array(isoCountryCodeSchema).max(30).transform(unique).default([]),
  organizationTypes: z.array(z.enum(organizationTypeValues)).max(organizationTypeValues.length).transform(unique).default([])
});
export type TargetingRules = z.infer<typeof targetingRulesSchema>;
export const emptyTargetingRules: TargetingRules = { personas: [], countries: [], organizationTypes: [] };

/** A route, or one of its modules (no module means the whole route). The same pair listed twice counts once. */
const campaignRouteSchema = z.strictObject({ routeId: z.uuid(), routeModuleId: z.uuid().optional() });
export type CampaignRouteInput = z.infer<typeof campaignRouteSchema>;
const campaignRoutesSchema = z.array(campaignRouteSchema).transform((routes) => [...new Map(routes.map((route) => [`${route.routeId}:${route.routeModuleId ?? ""}`, route])).values()]).pipe(z.array(campaignRouteSchema).max(maxCampaignRoutes));

const endsNotBeforeStart = (input: Readonly<{ startsAt?: Date | null | undefined; endsAt?: Date | null | undefined }>) => !input.startsAt || !input.endsAt || input.endsAt.getTime() >= input.startsAt.getTime();
const windowOutOfOrder = { path: ["endsAt"], message: "The end cannot be before the start." };
const hasChange = (input: Readonly<Record<string, unknown>>, ignoredKey?: string) => Object.entries(input).some(([key, value]) => key !== ignoredKey && value !== undefined);

/** A bounded initiative: a goal, a time window, the routes it works and who it is for. It starts as a draft. */
export const createCampaignInputSchema = z.strictObject({
  name: displayNameSchema(120),
  goal: optionalTextSchema(1000).optional(),
  startsAt: isoTimestampSchema.optional(),
  endsAt: isoTimestampSchema.optional(),
  targetingRules: targetingRulesSchema.default(emptyTargetingRules),
  routes: campaignRoutesSchema.default([])
}).refine(endsNotBeforeStart, windowOutOfOrder);
export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;

/** Omitted means unchanged; `null` clears the goal or a date. Routes and status have their own commands. */
export const campaignFieldsSchema = z.strictObject({
  name: displayNameSchema(120).optional(),
  goal: optionalTextSchema(1000).nullable().optional(),
  startsAt: isoTimestampSchema.nullable().optional(),
  endsAt: isoTimestampSchema.nullable().optional(),
  targetingRules: targetingRulesSchema.optional()
});
/** The editable fields alone (the web API takes the id from the path). */
export const campaignChangesSchema = campaignFieldsSchema.refine((input) => hasChange(input), "Provide at least one field to change").refine(endsNotBeforeStart, windowOutOfOrder);
export type CampaignChanges = z.infer<typeof campaignChangesSchema>;
export const updateCampaignInputSchema = campaignFieldsSchema.extend({ campaignId: z.uuid() }).refine((input) => hasChange(input, "campaignId"), "Provide at least one field to change").refine(endsNotBeforeStart, windowOutOfOrder);
export type UpdateCampaignInput = z.infer<typeof updateCampaignInputSchema>;

/** Replaces the whole list of routes the campaign works. */
export const campaignRoutesBodySchema = z.strictObject({ routes: campaignRoutesSchema });
export const setCampaignRoutesInputSchema = z.strictObject({ campaignId: z.uuid(), ...campaignRoutesBodySchema.shape });
export type SetCampaignRoutesInput = z.infer<typeof setCampaignRoutesInputSchema>;

export const campaignStatusBodySchema = z.strictObject({ status: statusSchema });
export const setCampaignStatusInputSchema = z.strictObject({ campaignId: z.uuid(), ...campaignStatusBodySchema.shape });
export type SetCampaignStatusInput = z.infer<typeof setCampaignStatusInputSchema>;

export const campaignIdInputSchema = z.strictObject({ campaignId: z.uuid() });
export type CampaignIdInput = z.infer<typeof campaignIdInputSchema>;

export const campaignProspectsBodySchema = z.strictObject({ prospectIds: z.array(z.uuid()).min(1).max(maxProspectsPerRequest).transform(unique) });
export const campaignProspectsInputSchema = z.strictObject({ campaignId: z.uuid(), ...campaignProspectsBodySchema.shape });
export type CampaignProspectsInput = z.infer<typeof campaignProspectsInputSchema>;

export const campaignSortValues = ["updated"] as const;
export type CampaignSort = (typeof campaignSortValues)[number];
export const campaignPagination = createKeysetPagination(campaignSortValues, { defaultLimit: 25 });

export const campaignSearchQuerySchema = z.strictObject({
  q: optionalTextSchema(120).optional(),
  status: statusSchema.optional(),
  scope: recordScopeSchema.default("active"),
  /** Only campaigns this prospect belongs to, for choosing one when logging outreach. */
  prospectId: z.uuid().optional(),
  sort: campaignPagination.sortSchema.default("updated"),
  limit: campaignPagination.limitSchema,
  cursor: campaignPagination.cursorSchema.optional()
}).superRefine(campaignPagination.validateCursor);
export type CampaignSearchQuery = z.infer<typeof campaignSearchQuerySchema>;

export const memberSortValues = ["added"] as const;
export type MemberSort = (typeof memberSortValues)[number];
export const memberPagination = createKeysetPagination(memberSortValues, { defaultLimit: 25 });

export const campaignMembersQuerySchema = z.strictObject({
  sort: memberPagination.sortSchema.default("added"),
  limit: memberPagination.limitSchema,
  cursor: memberPagination.cursorSchema.optional()
}).superRefine(memberPagination.validateCursor);
export type CampaignMembersQuery = z.infer<typeof campaignMembersQuerySchema>;

export const campaignSuggestionsQuerySchema = z.strictObject({ q: optionalTextSchema(120).optional(), limit: z.coerce.number().int().min(1).max(50).default(25) });
export type CampaignSuggestionsQuery = z.infer<typeof campaignSuggestionsQuerySchema>;
