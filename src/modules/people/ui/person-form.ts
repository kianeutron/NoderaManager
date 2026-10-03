import { createPersonInputSchema, personEmailsSchema, personFieldsSchema, personLinksSchema, type PersonChanges } from "@/modules/people/domain/person.schema";
import type { Persona, PersonDetail, PersonLinkType } from "@/modules/people/domain/person.types";
import { blankToUndefined, definedEntries, diffList, diffText } from "@/shared/ui/form/form-values";

export type PersonLinkFormValue = Readonly<{ type: PersonLinkType; url: string; label: string }>;

export type PersonFormValues = Readonly<{
  fullName: string;
  role: string;
  /** Empty means not set. */
  persona: Persona | "";
  organization: Readonly<{ id: string; name: string }> | null;
  countryCode: string;
  city: string;
  languages: string[];
  /** The first email is primary. */
  emails: string[];
  linkedinUrl: string;
  /** Extra links (website, GitHub…); the LinkedIn profile has its own field. */
  links: PersonLinkFormValue[];
}>;

export const emptyPersonForm: PersonFormValues = { fullName: "", role: "", persona: "", organization: null, countryCode: "", city: "", languages: [], emails: [], linkedinUrl: "", links: [] };

export function personToFormValues(person: PersonDetail): PersonFormValues {
  return {
    fullName: person.fullName,
    role: person.role ?? "",
    persona: person.persona ?? "",
    organization: person.organization,
    countryCode: person.countryCode ?? "",
    city: person.city ?? "",
    languages: [...person.languages],
    emails: person.emails.map(({ email }) => email),
    linkedinUrl: person.linkedinUrl ?? "",
    links: person.links.map(({ type, url, label }) => ({ type, url, label: label ?? "" }))
  };
}

/** Rows left without an address are unfilled, not errors. */
export function toLinkInputs(links: readonly PersonLinkFormValue[]) {
  return links.filter((link) => link.url.trim()).map((link) => ({ type: link.type, url: link.url.trim(), ...(link.label.trim() ? { label: link.label.trim() } : {}) }));
}

export function toCreatePersonInput(values: PersonFormValues, confirmNewIdentity = false): unknown {
  return definedEntries({
    fullName: values.fullName,
    role: blankToUndefined(values.role),
    persona: values.persona || undefined,
    organizationId: values.organization?.id,
    countryCode: blankToUndefined(values.countryCode),
    city: blankToUndefined(values.city),
    languages: values.languages,
    emails: values.emails,
    linkedinUrl: blankToUndefined(values.linkedinUrl),
    confirmNewIdentity
  });
}

/** Creating is two commands (the person, then their links), so the form validates both against their own schemas at once. */
export const createPersonFormSchema = createPersonInputSchema.extend(personLinksSchema.shape);

export function toCreatePersonFormInput(values: PersonFormValues): unknown {
  return { ...(toCreatePersonInput(values) as object), links: toLinkInputs(values.links) };
}

/** What is known about the person, in the shape the duplicate check takes. Null when there is nothing to compare on. */
export function toDuplicateCheckInput(values: PersonFormValues) {
  const { fullName, emails, organization, linkedinUrl } = values;
  if (emails.length === 0 && !organization && !linkedinUrl.trim()) return null;
  const linkedInUrl = blankToUndefined(linkedinUrl);
  return { fullName: fullName.trim(), ...(emails.length > 0 ? { emails } : {}), ...(linkedInUrl ? { linkedInUrl } : {}), ...(organization ? { organizationId: organization.id } : {}) };
}

/** Only what differs from the saved record; `null` clears a field. Emails are a separate command. */
function toPersonChanges(values: PersonFormValues, initial: PersonFormValues) {
  return definedEntries({
    fullName: values.fullName.trim() === initial.fullName ? undefined : values.fullName,
    role: diffText(values.role, initial.role),
    persona: values.persona === initial.persona ? undefined : values.persona || null,
    organizationId: values.organization?.id === initial.organization?.id ? undefined : values.organization?.id ?? null,
    countryCode: diffText(values.countryCode, initial.countryCode),
    city: diffText(values.city, initial.city),
    languages: diffList(values.languages, initial.languages),
    linkedinUrl: diffText(values.linkedinUrl, initial.linkedinUrl)
  });
}

/** Edits validate the changed fields and the email list with the command rules, without demanding a change. */
export const editPersonFormSchema = personFieldsSchema.extend(personEmailsSchema.shape).extend(personLinksSchema.shape);

export function toEditPersonInput(values: PersonFormValues, initial: PersonFormValues): unknown {
  return { ...toPersonChanges(values, initial), emails: values.emails, links: toLinkInputs(values.links) };
}

export type PersonSubmission = Readonly<{ changes: PersonChanges | null; emails: string[] | null; links: ReturnType<typeof toLinkInputs> | null }>;

export function toPersonSubmission(values: PersonFormValues, initial: PersonFormValues): PersonSubmission {
  const changes = toPersonChanges(values, initial);
  const links = toLinkInputs(values.links);
  return {
    changes: Object.keys(changes).length > 0 ? (changes as PersonChanges) : null,
    emails: diffList(values.emails, initial.emails) ?? null,
    links: JSON.stringify(links) === JSON.stringify(toLinkInputs(initial.links)) ? null : links
  };
}
