import { v7 as uuidv7 } from "uuid";
import { findDuplicateCandidates } from "@/modules/people/application/duplicate-candidate.service";
import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { PersonCommandsRepository } from "@/modules/people/data/person-commands.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import { normalizeEmail } from "@/modules/people/domain/identity-normalization";
import type { CreatePersonInput } from "@/modules/people/domain/person.schema";
import type { CreatePersonResult, DuplicateCandidate } from "@/modules/people/domain/person.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { normalizeLinkedInUrl } from "@/shared/lib/linkedin-url";
import { normalizeText } from "@/shared/lib/normalize-text";

type CreatePersonDependencies = Readonly<{
  reads: Pick<PersonRepository, "findIdentityMatches">;
  organizations: Pick<OrganizationRepository, "findOrganization">;
  commands: Pick<PersonCommandsRepository, "insertPerson">;
}>;

const describe = (candidate: DuplicateCandidate) => `"${candidate.fullName}" (person ${candidate.personId})`;

/**
 * Runs the shared duplicate check first. An exact match (same email or LinkedIn profile) blocks creation; a strong one
 * (same name and organization) needs `confirmNewIdentity`; weaker ones are returned so the caller can double-check.
 */
export async function createPerson({ reads, organizations, commands }: CreatePersonDependencies, actor: AuthenticatedActor, input: CreatePersonInput): Promise<CreatePersonResult> {
  if (input.organizationId && !(await organizations.findOrganization(input.organizationId))) throw new ApplicationError("not_found", "Organization not found", "organization_not_found");

  const candidates = await findDuplicateCandidates(reads, { fullName: input.fullName, emails: input.emails, linkedInUrl: input.linkedinUrl, organizationId: input.organizationId });
  const exact = candidates.find((candidate) => candidate.matchLevel === "exact");
  if (exact) throw new ApplicationError("conflict", `${describe(exact)} already exists (${exact.reason.toLowerCase()}). Use that person instead of creating a duplicate.`, "person_duplicate_exact");

  const strong = candidates.filter((candidate) => candidate.matchLevel === "strong");
  if (strong.length > 0 && !input.confirmNewIdentity) {
    throw new ApplicationError("conflict", `Possible duplicate: ${strong.map(describe).join(", ")} (same name and organization). If this is genuinely a different person, repeat the request with confirmNewIdentity: true.`, "person_duplicate_strong");
  }

  const personId = uuidv7();
  const auditEventId = await commands.insertPerson({
    personId,
    organizationId: input.organizationId ?? null,
    fullName: input.fullName,
    normalizedName: normalizeText(input.fullName),
    linkedinUrl: input.linkedinUrl ?? null,
    normalizedLinkedinUrl: input.linkedinUrl ? normalizeLinkedInUrl(input.linkedinUrl) : null,
    role: input.role ?? null,
    persona: input.persona ?? null,
    countryCode: input.countryCode ?? null,
    city: input.city ?? null,
    languages: input.languages,
    emails: input.emails.map((email, index) => ({ email, normalizedEmail: normalizeEmail(email), isPrimary: index === 0 })),
    // Contact details themselves stay out of the audit trail; counts and context are enough.
    audit: toAuditEvent(actor, {
      action: "person.created",
      entityType: "person",
      entityId: personId,
      summary: `Created person "${input.fullName}"`,
      metadata: { organizationId: input.organizationId ?? null, persona: input.persona ?? null, countryCode: input.countryCode ?? null, emailCount: input.emails.length, hasLinkedIn: input.linkedinUrl !== undefined, confirmedNewIdentity: strong.length > 0 }
    })
  });

  return { personId, created: true, auditEventId, possibleDuplicates: candidates };
}
