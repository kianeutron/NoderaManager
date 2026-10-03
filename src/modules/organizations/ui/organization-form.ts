import { organizationDomainsSchema, organizationFieldsSchema, type OrganizationChanges } from "@/modules/organizations/domain/organization.schema";
import type { OrganizationDetail, OrganizationSizeBand, OrganizationType } from "@/modules/organizations/domain/organization.types";
import { blankToUndefined, definedEntries, diffList, diffText } from "@/shared/ui/form/form-values";

export type OrganizationFormValues = Readonly<{
  name: string;
  organizationType: OrganizationType;
  /** Empty means not set. */
  sizeBand: OrganizationSizeBand | "";
  websiteUrl: string;
  linkedinUrl: string;
  countryCode: string;
  industry: string;
  notes: string;
  /** The first domain is canonical. */
  domains: string[];
}>;

export const emptyOrganizationForm: OrganizationFormValues = { name: "", organizationType: "company", sizeBand: "", websiteUrl: "", linkedinUrl: "", countryCode: "", industry: "", notes: "", domains: [] };

export function organizationToFormValues(organization: OrganizationDetail): OrganizationFormValues {
  return {
    name: organization.name,
    organizationType: organization.organizationType,
    sizeBand: organization.sizeBand ?? "",
    websiteUrl: organization.websiteUrl ?? "",
    linkedinUrl: organization.linkedinUrl ?? "",
    countryCode: organization.countryCode ?? "",
    industry: organization.industry ?? "",
    notes: organization.notes ?? "",
    domains: organization.domains.map(({ domain }) => domain)
  };
}

export function toCreateOrganizationInput(values: OrganizationFormValues): unknown {
  return definedEntries({
    name: values.name,
    organizationType: values.organizationType,
    sizeBand: values.sizeBand || undefined,
    websiteUrl: blankToUndefined(values.websiteUrl),
    linkedinUrl: blankToUndefined(values.linkedinUrl),
    countryCode: blankToUndefined(values.countryCode),
    industry: blankToUndefined(values.industry),
    notes: blankToUndefined(values.notes),
    domains: values.domains
  });
}

/** Only what differs from the saved record; `null` clears a field. */
export function toOrganizationChanges(values: OrganizationFormValues, initial: OrganizationFormValues) {
  return definedEntries({
    name: values.name.trim() === initial.name ? undefined : values.name,
    organizationType: values.organizationType === initial.organizationType ? undefined : values.organizationType,
    sizeBand: values.sizeBand === initial.sizeBand ? undefined : values.sizeBand || null,
    websiteUrl: diffText(values.websiteUrl, initial.websiteUrl),
    linkedinUrl: diffText(values.linkedinUrl, initial.linkedinUrl),
    countryCode: diffText(values.countryCode, initial.countryCode),
    industry: diffText(values.industry, initial.industry),
    notes: diffText(values.notes, initial.notes)
  });
}

/** Edits validate the changed fields and the domain list with the command rules, without demanding a change. */
export const editOrganizationFormSchema = organizationFieldsSchema.extend(organizationDomainsSchema.shape);

export function toEditOrganizationInput(values: OrganizationFormValues, initial: OrganizationFormValues): unknown {
  return { ...toOrganizationChanges(values, initial), domains: values.domains };
}

export type OrganizationSubmission = Readonly<{ changes: OrganizationChanges | null; domains: string[] | null }>;

export function toOrganizationSubmission(values: OrganizationFormValues, initial: OrganizationFormValues): OrganizationSubmission {
  const changes = toOrganizationChanges(values, initial);
  return { changes: Object.keys(changes).length > 0 ? (changes as OrganizationChanges) : null, domains: diffList(values.domains, initial.domains) ?? null };
}
