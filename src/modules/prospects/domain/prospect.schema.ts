import { z } from "zod";
import { createKeysetPagination } from "@/shared/api/keyset";
import { httpUrlSchema, isoCountryCodeSchema, isoTimestampSchema, optionalTextSchema } from "@/shared/api/field-schemas";
import { prospectSourceValues, prospectStatusValues, prospectTemperatureValues, signalTypeValues, structuralReasonValues } from "@/shared/db/schema/crm-values";

const statusSchema = z.enum(prospectStatusValues);
const temperatureSchema = z.enum(prospectTemperatureValues);
const sourceSchema = z.enum(prospectSourceValues);
const structuralReasonSchema = z.enum(structuralReasonValues);

/** A new prospect starts researched or ready; later states come from status updates and outreach. */
const startingStatusSchema = z.enum(["researched", "ready"]);

export const createProspectInputSchema = z.strictObject({
  personId: z.uuid().optional(),
  organizationId: z.uuid().optional(),
  routeId: z.uuid(),
  routeModuleId: z.uuid().optional(),
  status: startingStatusSchema.default("researched"),
  temperature: temperatureSchema.optional(),
  source: sourceSchema.optional(),
  whyTargeted: optionalTextSchema(2000).optional(),
  currentTrigger: optionalTextSchema(500).optional(),
  nextAction: optionalTextSchema(500).optional()
}).refine((input) => input.personId !== undefined || input.organizationId !== undefined, "Provide a person, an organization, or both");
export type CreateProspectInput = z.infer<typeof createProspectInputSchema>;

export const prospectFieldsSchema = z.strictObject({
  routeId: z.uuid().optional(),
  routeModuleId: z.uuid().nullable().optional(),
  temperature: temperatureSchema.nullable().optional(),
  source: sourceSchema.nullable().optional(),
  whyTargeted: optionalTextSchema(2000).nullable().optional(),
  currentTrigger: optionalTextSchema(500).nullable().optional(),
  nextAction: optionalTextSchema(500).nullable().optional()
});
const hasChange = (input: Readonly<Record<string, unknown>>, ignoredKey?: string) => Object.entries(input).some(([key, value]) => key !== ignoredKey && value !== undefined);

/** The editable fields alone (the web API takes the id from the path). Omitted means unchanged; `null` clears an optional field. Changing the route without a module clears the module. */
export const prospectChangesSchema = prospectFieldsSchema.refine((input) => hasChange(input), "Provide at least one field to change");
export type ProspectChanges = z.infer<typeof prospectChangesSchema>;

export const updateProspectInputSchema = prospectFieldsSchema.extend({ prospectId: z.uuid() }).refine((input) => hasChange(input, "prospectId"), "Provide at least one field to change");
export type UpdateProspectInput = z.infer<typeof updateProspectInputSchema>;

const prospectStatusFields = z.strictObject({ status: statusSchema, structuralReason: structuralReasonSchema.optional() });

/** A disqualification needs its structural reason and no other status may carry one (docs/11-operations/00-status-taxonomy.md). Checked here so forms and tools give the same answer; the service enforces it again. */
function requireStructuralReasonOnlyWhenDisqualified(input: z.infer<typeof prospectStatusFields>, context: z.RefinementCtx): void {
  if (input.status === "disqualified" && input.structuralReason === undefined) context.addIssue({ code: "custom", path: ["structuralReason"], message: "Choose why this prospect is disqualified." });
  if (input.status !== "disqualified" && input.structuralReason !== undefined) context.addIssue({ code: "custom", path: ["structuralReason"], message: "A reason applies only when a prospect is disqualified." });
}

export const prospectStatusChangeSchema = prospectStatusFields.superRefine(requireStructuralReasonOnlyWhenDisqualified);
export const updateProspectStatusInputSchema = prospectStatusFields.extend({ prospectId: z.uuid() }).superRefine(requireStructuralReasonOnlyWhenDisqualified);
export type UpdateProspectStatusInput = z.infer<typeof updateProspectStatusInputSchema>;

export const addSignalInputSchema = z.strictObject({
  prospectId: z.uuid(),
  type: z.enum(signalTypeValues),
  summary: z.string().trim().min(1).max(500),
  sourceUrl: httpUrlSchema.optional(),
  observedAt: isoTimestampSchema.optional(),
  expiresAt: isoTimestampSchema.optional()
}).refine((input) => input.expiresAt === undefined || input.observedAt === undefined || input.expiresAt >= input.observedAt, { path: ["expiresAt"], message: "A signal cannot expire before it was observed" });
export type AddSignalInput = z.infer<typeof addSignalInputSchema>;

export const prospectIdInputSchema = z.strictObject({ prospectId: z.uuid() });
export type ProspectIdInput = z.infer<typeof prospectIdInputSchema>;

export const prospectSortValues = ["updated"] as const;
export type ProspectSort = (typeof prospectSortValues)[number];
export const prospectPagination = createKeysetPagination(prospectSortValues, { defaultLimit: 25 });

export const prospectSearchQuerySchema = z.strictObject({
  q: optionalTextSchema(120).optional(),
  statuses: z.array(statusSchema).max(prospectStatusValues.length).optional(),
  routeId: z.uuid().optional(),
  routeModuleId: z.uuid().optional(),
  personId: z.uuid().optional(),
  organizationId: z.uuid().optional(),
  temperature: temperatureSchema.optional(),
  countryCode: isoCountryCodeSchema.optional(),
  sort: prospectPagination.sortSchema.default("updated"),
  limit: prospectPagination.limitSchema,
  cursor: prospectPagination.cursorSchema.optional()
}).superRefine(prospectPagination.validateCursor);
export type ProspectSearchQuery = z.infer<typeof prospectSearchQuerySchema>;
