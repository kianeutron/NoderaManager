import { normalizeEmail } from "@/modules/people/domain/identity-normalization";
import type { DuplicateCandidate, DuplicateMatchLevel } from "@/modules/people/domain/person.types";
import { normalizeOrganizationDomain } from "@/modules/organizations/domain/organization-normalization";
import { normalizeLinkedInUrl } from "@/shared/lib/linkedin-url";
import { normalizeText } from "@/shared/lib/normalize-text";

/** Anything known about a person that can identify them. All fields except the name are optional. */
export type IdentityFields = Readonly<{
  fullName: string;
  email?: string | undefined;
  emails?: readonly string[] | undefined;
  linkedInUrl?: string | undefined;
  organizationId?: string | undefined;
  organizationDomain?: string | undefined;
}>;

export type DuplicateLookup = Readonly<{
  normalizedName: string;
  normalizedEmails: readonly string[];
  normalizedLinkedInUrl?: string;
  organizationId?: string;
  organizationDomain?: string;
}>;

export function getDuplicateLookupKeys(input: IdentityFields): DuplicateLookup {
  const normalizedEmails = [...new Set([...(input.email ? [input.email] : []), ...(input.emails ?? [])].map(normalizeEmail))];
  return {
    normalizedName: normalizeText(input.fullName),
    normalizedEmails,
    ...(input.linkedInUrl ? { normalizedLinkedInUrl: normalizeLinkedInUrl(input.linkedInUrl) } : {}),
    ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    ...(input.organizationDomain ? { organizationDomain: normalizeOrganizationDomain(input.organizationDomain) } : {})
  };
}

/** An existing person, with everything needed to compare, gathered by the repository. */
export type IdentityMatchRow = Readonly<{
  personId: string;
  fullName: string;
  normalizedName: string;
  normalizedLinkedinUrl: string | null;
  organizationId: string | null;
  organizationName: string | null;
  normalizedEmails: readonly string[];
  organizationDomains: readonly string[];
}>;

const levelRank: Record<DuplicateMatchLevel, number> = { exact: 0, strong: 1, weak: 2 };

/**
 * Exact: same email or LinkedIn identity (blocks creation). Strong: same name and same organization or domain
 * (needs confirmation). Weak: same name only (advisory). Names alone never merge anyone.
 */
function classify(row: IdentityMatchRow, lookup: DuplicateLookup): Pick<DuplicateCandidate, "matchLevel" | "reason"> {
  if (lookup.normalizedEmails.some((email) => row.normalizedEmails.includes(email))) return { matchLevel: "exact", reason: "Matching normalized email" };
  if (lookup.normalizedLinkedInUrl && row.normalizedLinkedinUrl === lookup.normalizedLinkedInUrl) return { matchLevel: "exact", reason: "Matching LinkedIn profile" };

  if (row.normalizedName === lookup.normalizedName) {
    if (lookup.organizationId && row.organizationId === lookup.organizationId) return { matchLevel: "strong", reason: "Matching name and organization" };
    if (lookup.organizationDomain && row.organizationDomains.includes(lookup.organizationDomain)) return { matchLevel: "strong", reason: "Matching name and organization domain" };
  }
  return { matchLevel: "weak", reason: "Similar name" };
}

export function classifyCandidates(rows: readonly IdentityMatchRow[], lookup: DuplicateLookup): DuplicateCandidate[] {
  return rows
    .map((row) => ({ personId: row.personId, fullName: row.fullName, organizationName: row.organizationName, ...classify(row, lookup) }))
    .toSorted((left, right) => levelRank[left.matchLevel] - levelRank[right.matchLevel] || left.fullName.localeCompare(right.fullName));
}
