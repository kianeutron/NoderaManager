import { z } from "zod";
import { displayNameSchema, optionalTextSchema, recordScopeSchema } from "@/shared/api/field-schemas";

/** Routes are acquisition strategies (Agency Overflow, Recruiters), not channels; modules refine them. */
export const createRouteInputSchema = z.strictObject({
  name: displayNameSchema(120),
  description: optionalTextSchema(1000).optional(),
  sortOrder: z.number().int().min(0).max(1000).default(0)
});
export type CreateRouteInput = z.infer<typeof createRouteInputSchema>;

export const createRouteModuleInputSchema = z.strictObject({
  routeId: z.uuid(),
  name: displayNameSchema(120),
  description: optionalTextSchema(1000).optional()
});
export type CreateRouteModuleInput = z.infer<typeof createRouteModuleInputSchema>;

const sortOrderSchema = z.number().int().min(0).max(1000);
const hasChange = (input: Readonly<Record<string, unknown>>, ignoredKey?: string) => Object.entries(input).some(([key, value]) => key !== ignoredKey && value !== undefined);

/** Omitted means unchanged; `null` clears the description. */
export const routeFieldsSchema = z.strictObject({ name: displayNameSchema(120).optional(), description: optionalTextSchema(1000).nullable().optional(), sortOrder: sortOrderSchema.optional() });
/** The editable fields alone (the web API takes the id from the path). */
export const routeChangesSchema = routeFieldsSchema.refine((input) => hasChange(input), "Provide at least one field to change");
export type RouteChanges = z.infer<typeof routeChangesSchema>;
export const updateRouteInputSchema = routeFieldsSchema.extend({ routeId: z.uuid() }).refine((input) => hasChange(input, "routeId"), "Provide at least one field to change");
export type UpdateRouteInput = z.infer<typeof updateRouteInputSchema>;

export const moduleFieldsSchema = z.strictObject({ name: displayNameSchema(120).optional(), description: optionalTextSchema(1000).nullable().optional() });
export const moduleChangesSchema = moduleFieldsSchema.refine((input) => hasChange(input), "Provide at least one field to change");
export type ModuleChanges = z.infer<typeof moduleChangesSchema>;
export const updateRouteModuleInputSchema = moduleFieldsSchema.extend({ routeModuleId: z.uuid() }).refine((input) => hasChange(input, "routeModuleId"), "Provide at least one field to change");
export type UpdateRouteModuleInput = z.infer<typeof updateRouteModuleInputSchema>;

/** The body of a module created under a route in the web API (the route comes from the path). */
export const routeModuleBodySchema = z.strictObject({ name: displayNameSchema(120), description: optionalTextSchema(1000).optional() });
export type RouteModuleBody = z.infer<typeof routeModuleBodySchema>;

export const routeIdInputSchema = z.strictObject({ routeId: z.uuid() });
export type RouteIdInput = z.infer<typeof routeIdInputSchema>;
export const routeModuleIdInputSchema = z.strictObject({ routeModuleId: z.uuid() });
export type RouteModuleIdInput = z.infer<typeof routeModuleIdInputSchema>;

export const routeOverviewQuerySchema = z.strictObject({ scope: recordScopeSchema.default("active") });
export type RouteOverviewQuery = z.infer<typeof routeOverviewQuerySchema>;

