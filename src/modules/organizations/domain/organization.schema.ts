import { z } from "zod";
import { dedupeDomains, organizationDomainSchema } from "@/modules/organizations/domain/organization-normalization";
import { createKeysetPagination } from "@/shared/api/keyset";
import { displayNameSchema, httpUrlSchema, isoCountryCodeSchema, linkedInUrlSchema, optionalTextSchema, recordScopeSchema } from "@/shared/api/field-schemas";
import { organizationSizeBandValues, organizationTypeValues } from "@/shared/db/schema/crm-values";

export const organizationSortValues = ["updated", "name"] as const;
export type OrganizationSort = (typeof organizationSortValues)[number];
export const organizationPagination = createKeysetPagination(organizationSortValues, { defaultLimit: 25 });

const organizationId = z.uuid();
export const maxDomainsPerOrganization = 10;
const organizationTypeSchema = z.enum(organizationTypeValues);
const sizeBandSchema = z.enum(organizationSizeBandValues);
const domainListSchema = z.array(organizationDomainSchema).max(maxDomainsPerOrganization).transform(dedupeDomains);

/** The first domain is the canonical one; it is the strongest duplicate signal (docs/02-data/04-deduplication.md). */
export const createOrganizationInputSchema = z.strictObject({
  name: displayNameSchema(160),
  organizationType: organizationTypeSchema.default("company"),
  sizeBand: sizeBandSchema.optional(),
  websiteUrl: httpUrlSchema.optional(),
  linkedinUrl: linkedInUrlSchema.optional(),
  countryCode: isoCountryCodeSchema.optional(),
  industry: optionalTextSchema(120).optional(),
  notes: optionalTextSchema(5000).optional(),
  domains: domainListSchema.default([])
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

const hasChange = (input: Readonly<Record<string, unknown>>, ignoredKey?: string) => Object.entries(input).some(([key, value]) => key !== ignoredKey && value !== undefined);
export const organizationFieldsSchema = z.strictObject({
  name: displayNameSchema(160).optional(),
  organizationType: organizationTypeSchema.optional(),
  sizeBand: sizeBandSchema.nullable().optional(),
  websiteUrl: httpUrlSchema.nullable().optional(),
  linkedinUrl: linkedInUrlSchema.nullable().optional(),
  countryCode: isoCountryCodeSchema.nullable().optional(),
  industry: optionalTextSchema(120).nullable().optional(),
  notes: optionalTextSchema(5000).nullable().optional()
});

/** The editable fields alone (the web API takes the id from the path). Omitted means unchanged; `null` clears an optional field. */
export const organizationChangesSchema = organizationFieldsSchema.refine((input) => hasChange(input), "Provide at least one field to change");
export type OrganizationChanges = z.infer<typeof organizationChangesSchema>;

export const updateOrganizationInputSchema = organizationFieldsSchema.extend({ organizationId }).refine((input) => hasChange(input, "organizationId"), "Provide at least one field to change");
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;

/** The first domain is canonical. Replaces the whole list. */
export const organizationDomainsSchema = z.strictObject({ domains: domainListSchema });
export const setOrganizationDomainsInputSchema = z.strictObject({ organizationId, ...organizationDomainsSchema.shape });
export type SetOrganizationDomainsInput = z.infer<typeof setOrganizationDomainsInputSchema>;

/** The name a new company would have, checked against existing ones before it is created. */
export const similarOrganizationCheckSchema = z.strictObject({ name: displayNameSchema(160) });
export type SimilarOrganizationCheckInput = z.infer<typeof similarOrganizationCheckSchema>;

export const organizationIdInputSchema = z.strictObject({ organizationId });
export type OrganizationIdInput = z.infer<typeof organizationIdInputSchema>;

export const organizationSearchQuerySchema = z.strictObject({
  q: optionalTextSchema(120).optional(),
  organizationType: organizationTypeSchema.optional(),
  countryCode: isoCountryCodeSchema.optional(),
  scope: recordScopeSchema.default("active"),
  sort: organizationPagination.sortSchema.default("updated"),
  limit: organizationPagination.limitSchema,
  cursor: organizationPagination.cursorSchema.optional()
}).superRefine(organizationPagination.validateCursor);
export type OrganizationSearchQuery = z.infer<typeof organizationSearchQuerySchema>;
