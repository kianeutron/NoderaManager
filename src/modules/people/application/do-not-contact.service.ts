import type { PersonCommandsRepository } from "@/modules/people/data/person-commands.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import type { MarkDoNotContactInput, PersonIdInput } from "@/modules/people/domain/person.schema";
import type { DoNotContactResult } from "@/modules/people/domain/person.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type DoNotContactDependencies = Readonly<{
  reads: Pick<PersonRepository, "findPerson">;
  commands: Pick<PersonCommandsRepository, "setDoNotContact">;
}>;

async function requirePerson(reads: DoNotContactDependencies["reads"], personId: string) {
  const person = await reads.findPerson(personId);
  if (!person) throw new ApplicationError("not_found", "Person not found");
  return person;
}

/** A safety flag the owner sets explicitly. Idempotent for the same reason; a new reason updates it. */
export async function markPersonDoNotContact({ reads, commands }: DoNotContactDependencies, actor: AuthenticatedActor, input: MarkDoNotContactInput): Promise<DoNotContactResult> {
  const person = await requirePerson(reads, input.personId);
  if (person.doNotContactAt !== null && person.doNotContactReason === input.reason) return { personId: person.id, doNotContact: true, changed: false, auditEventId: null };

  const auditEventId = await commands.setDoNotContact(person.id, { at: person.doNotContactAt ?? new Date(), reason: input.reason }, toAuditEvent(actor, {
    action: "person.do_not_contact_set",
    entityType: "person",
    entityId: person.id,
    summary: `Marked "${person.fullName}" do-not-contact`,
    metadata: { reason: input.reason }
  }));

  return { personId: person.id, doNotContact: true, changed: true, auditEventId };
}

export async function clearPersonDoNotContact({ reads, commands }: DoNotContactDependencies, actor: AuthenticatedActor, input: PersonIdInput): Promise<DoNotContactResult> {
  const person = await requirePerson(reads, input.personId);
  if (person.doNotContactAt === null) return { personId: person.id, doNotContact: false, changed: false, auditEventId: null };

  const auditEventId = await commands.setDoNotContact(person.id, { at: null, reason: null }, toAuditEvent(actor, {
    action: "person.do_not_contact_cleared",
    entityType: "person",
    entityId: person.id,
    summary: `Cleared do-not-contact for "${person.fullName}"`,
    metadata: { previousReason: person.doNotContactReason }
  }));

  return { personId: person.id, doNotContact: false, changed: true, auditEventId };
}
