import type { PersonCommandsRepository } from "@/modules/people/data/person-commands.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import type { PersonIdInput } from "@/modules/people/domain/person.schema";
import type { ArchivePersonResult } from "@/modules/people/domain/person.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type SetPersonArchivedDependencies = Readonly<{
  reads: Pick<PersonRepository, "findPersonIncludingArchived">;
  commands: Pick<PersonCommandsRepository, "setArchived">;
}>;

async function setArchived({ reads, commands }: SetPersonArchivedDependencies, actor: AuthenticatedActor, input: PersonIdInput, archive: boolean): Promise<ArchivePersonResult> {
  const person = await reads.findPersonIncludingArchived(input.personId);
  if (!person) throw new ApplicationError("not_found", "Person not found");
  if ((person.archivedAt !== null) === archive) return { personId: person.id, archived: archive, changed: false, auditEventId: null };

  const auditEventId = await commands.setArchived(person.id, archive ? new Date() : null, toAuditEvent(actor, {
    action: archive ? "person.archived" : "person.restored",
    entityType: "person",
    entityId: person.id,
    summary: `${archive ? "Archived" : "Restored"} "${person.fullName}"`,
    metadata: {}
  }));

  return { personId: person.id, archived: archive, changed: true, auditEventId };
}

/** Hides a person from lists and searches; prospects, notes and history stay. Idempotent. */
export const archivePerson = (dependencies: SetPersonArchivedDependencies, actor: AuthenticatedActor, input: PersonIdInput) => setArchived(dependencies, actor, input, true);

export const restorePerson = (dependencies: SetPersonArchivedDependencies, actor: AuthenticatedActor, input: PersonIdInput) => setArchived(dependencies, actor, input, false);
