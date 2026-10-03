import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { PersonCommandsRepository, PersonPatch } from "@/modules/people/data/person-commands.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import type { UpdatePersonInput } from "@/modules/people/domain/person.schema";
import type { UpdatePersonResult } from "@/modules/people/domain/person.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import { toChangeMetadata } from "@/shared/audit/change-metadata";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { pickChangedFields } from "@/shared/lib/changed-fields";
import { normalizeLinkedInUrl } from "@/shared/lib/linkedin-url";
import { normalizeText } from "@/shared/lib/normalize-text";

type UpdatePersonDependencies = Readonly<{
  reads: Pick<PersonRepository, "findPerson" | "findPersonByLinkedin">;
  organizations: Pick<OrganizationRepository, "findOrganization">;
  commands: Pick<PersonCommandsRepository, "updatePerson">;
}>;

const editableFields = ["fullName", "role", "persona", "organizationId", "countryCode", "city", "linkedinUrl"] as const;

const sameLanguages = (left: readonly string[], right: readonly string[]) => left.length === right.length && left.every((language) => right.includes(language));

export async function updatePerson({ reads, organizations, commands }: UpdatePersonDependencies, actor: AuthenticatedActor, input: UpdatePersonInput): Promise<UpdatePersonResult> {
  const current = await reads.findPerson(input.personId);
  if (!current) throw new ApplicationError("not_found", "Person not found");

  const scalarChanges = pickChangedFields(current, input, editableFields);
  const languages = input.languages && !sameLanguages(current.languages, input.languages) ? input.languages : undefined;
  if (Object.keys(scalarChanges).length === 0 && !languages) return { personId: current.id, changed: false, auditEventId: null };

  if (scalarChanges.organizationId && !(await organizations.findOrganization(scalarChanges.organizationId))) throw new ApplicationError("not_found", "Organization not found", "organization_not_found");

  // The LinkedIn identity is unique, so moving it onto someone else's profile is refused rather than left to the index.
  const normalizedLinkedinUrl = scalarChanges.linkedinUrl ? normalizeLinkedInUrl(scalarChanges.linkedinUrl) : undefined;
  if (normalizedLinkedinUrl) {
    const owner = await reads.findPersonByLinkedin(normalizedLinkedinUrl);
    if (owner && owner.id !== current.id) throw new ApplicationError("conflict", `That LinkedIn profile already belongs to "${owner.fullName}" (person ${owner.id}).`, "linkedin_taken");
  }

  const changes = { ...scalarChanges, ...(languages ? { languages } : {}) };
  const patch: PersonPatch = {
    ...changes,
    ...(scalarChanges.fullName === undefined ? {} : { normalizedName: normalizeText(scalarChanges.fullName) }),
    ...(scalarChanges.linkedinUrl === undefined ? {} : { normalizedLinkedinUrl: normalizedLinkedinUrl ?? null })
  };

  const auditEventId = await commands.updatePerson(current.id, patch, toAuditEvent(actor, {
    action: "person.updated",
    entityType: "person",
    entityId: current.id,
    summary: `Updated ${Object.keys(changes).join(", ")} of "${current.fullName}"`,
    metadata: toChangeMetadata(current, changes)
  }));

  return { personId: current.id, changed: true, auditEventId };
}
