import { z } from "zod";
import { organizationDomainSchema } from "@/modules/organizations/domain/organization-normalization";
import { normalizeEmail } from "@/modules/people/domain/identity-normalization";
import { createKeysetPagination } from "@/shared/api/keyset";
import { displayNameSchema, httpUrlSchema, isoCountryCodeSchema, linkedInUrlSchema, optionalTextSchema, recordScopeSchema } from "@/shared/api/field-schemas";
import { personaValues, personLinkTypeValues } from "@/shared/db/schema/crm-values";
import { normalizeWebUrl } from "@/shared/lib/normalize-web-url";

export const emailSchema = z.email().max(320);

export const maxEmailsPerPerson = 10;
export const maxLanguagesPerPerson = 10;
const personaSchema = z.enum(personaValues);
const languageSchema = z.string().trim().transform((value) => value.toLowerCase()).pipe(z.string().regex(/^[a-z]{2}$/, "Use ISO 639-1 language codes such as en"));
const languageListSchema = z.array(languageSchema).max(maxLanguagesPerPerson).transform((languages) => [...new Set(languages)]);

/** The first email is primary. Repeats (compared case-insensitively) are dropped. */
function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter((email) => {
    const key = normalizeEmail(email);
    return !seen.has(key) && seen.add(key);
  });
}
const emailListSchema = z.array(emailSchema).transform(dedupeEmails).pipe(z.array(emailSchema).max(maxEmailsPerPerson));

/** What is known about someone, for duplicate checking before anything is created. */
export const personIdentitySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: emailSchema.optional(),
  emails: emailListSchema.optional(),
  linkedInUrl: z.url().optional(),
  organizationId: z.uuid().optional(),
  organizationDomain: organizationDomainSchema.optional(),
  countryCode: isoCountryCodeSchema.optional(),
  role: z.string().trim().max(160).optional()
}).refine((value) => value.email || value.emails?.length || value.linkedInUrl || value.organizationId || value.organizationDomain, {
  message: "Provide an email, LinkedIn profile, organization, or organization domain for duplicate checking."
});

export type PersonIdentityInput = z.infer<typeof personIdentitySchema>;

export const createPersonInputSchema = z.strictObject({
  fullName: displayNameSchema(160),
  role: optionalTextSchema(160).optional(),
  persona: personaSchema.optional(),
  organizationId: z.uuid().optional(),
  countryCode: isoCountryCodeSchema.optional(),
  city: optionalTextSchema(120).optional(),
  languages: languageListSchema.default([]),
  emails: emailListSchema.default([]),
  linkedinUrl: linkedInUrlSchema.optional(),
  /** Set only after a strong duplicate candidate (same name and organization) was reviewed and is a different person. */
  confirmNewIdentity: z.boolean().default(false)
});
export type CreatePersonInput = z.infer<typeof createPersonInputSchema>;

const hasChange = (input: Readonly<Record<string, unknown>>, ignoredKey?: string) => Object.entries(input).some(([key, value]) => key !== ignoredKey && value !== undefined);
export const personFieldsSchema = z.strictObject({
  fullName: displayNameSchema(160).optional(),
  role: optionalTextSchema(160).nullable().optional(),
  persona: personaSchema.nullable().optional(),
  organizationId: z.uuid().nullable().optional(),
  countryCode: isoCountryCodeSchema.nullable().optional(),
  city: optionalTextSchema(120).nullable().optional(),
  languages: languageListSchema.optional(),
  linkedinUrl: linkedInUrlSchema.nullable().optional()
});

/** The editable fields alone (the web API takes the id from the path). Omitted means unchanged; `null` clears an optional field. */
export const personChangesSchema = personFieldsSchema.refine((input) => hasChange(input), "Provide at least one field to change");
export type PersonChanges = z.infer<typeof personChangesSchema>;

export const updatePersonInputSchema = personFieldsSchema.extend({ personId: z.uuid() }).refine((input) => hasChange(input, "personId"), "Provide at least one field to change");
export type UpdatePersonInput = z.infer<typeof updatePersonInputSchema>;

/** The first email is primary. Replaces the whole list. */
export const personEmailsSchema = z.strictObject({ emails: emailListSchema });
export const setPersonEmailsInputSchema = z.strictObject({ personId: z.uuid(), ...personEmailsSchema.shape });
export type SetPersonEmailsInput = z.infer<typeof setPersonEmailsInputSchema>;

export const maxLinksPerPerson = 10;
const personLinkSchema = z.strictObject({ type: z.enum(personLinkTypeValues), url: httpUrlSchema, label: optionalTextSchema(80).optional() });

/** The same page written two ways (`www.`, trailing slash, tracking parameters) counts once; the first spelling is kept. */
function dedupeLinks(links: z.infer<typeof personLinkSchema>[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = normalizeWebUrl(link.url);
    return !seen.has(key) && seen.add(key);
  });
}

/** Replaces the whole list of extra links (website, portfolio, GitHub…). The LinkedIn profile has its own field. */
export const personLinksSchema = z.strictObject({ links: z.array(personLinkSchema).transform(dedupeLinks).pipe(z.array(personLinkSchema).max(maxLinksPerPerson)) });
export const setPersonLinksInputSchema = z.strictObject({ personId: z.uuid(), ...personLinksSchema.shape });
export type SetPersonLinksInput = z.infer<typeof setPersonLinksInputSchema>;

export const personIdInputSchema = z.strictObject({ personId: z.uuid() });
export type PersonIdInput = z.infer<typeof personIdInputSchema>;

/** Recorded only on the owner's explicit instruction, never inferred from a message (docs/04-mcp/05-chatgpt-operations.md). */
export const doNotContactReasonSchema = z.strictObject({ reason: z.string().trim().min(1).max(500) });
export const markDoNotContactInputSchema = z.strictObject({ personId: z.uuid(), ...doNotContactReasonSchema.shape });
export type MarkDoNotContactInput = z.infer<typeof markDoNotContactInputSchema>;

export const personSortValues = ["updated", "name"] as const;
export type PersonSort = (typeof personSortValues)[number];
export const personPagination = createKeysetPagination(personSortValues, { defaultLimit: 25 });

export const personSearchQuerySchema = z.strictObject({
  q: optionalTextSchema(120).optional(),
  organizationId: z.uuid().optional(),
  persona: personaSchema.optional(),
  countryCode: isoCountryCodeSchema.optional(),
  scope: recordScopeSchema.default("active"),
  sort: personPagination.sortSchema.default("updated"),
  limit: personPagination.limitSchema,
  cursor: personPagination.cursorSchema.optional()
}).superRefine(personPagination.validateCursor);
export type PersonSearchQuery = z.infer<typeof personSearchQuerySchema>;
