import type { PersonCommandsRepository } from "@/modules/people/data/person-commands.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import { normalizeEmail } from "@/modules/people/domain/identity-normalization";
import type { SetPersonEmailsInput } from "@/modules/people/domain/person.schema";
import type { SetPersonEmailsResult } from "@/modules/people/domain/person.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type SetPersonEmailsDependencies = Readonly<{
  reads: Pick<PersonRepository, "findPerson" | "listEmails" | "findEmailOwners">;
  commands: Pick<PersonCommandsRepository, "replaceEmails">;
}>;

/** Replaces the whole set (first is primary), which makes the command idempotent. An email another person owns is refused. */
export async function setPersonEmails({ reads, commands }: SetPersonEmailsDependencies, actor: AuthenticatedActor, input: SetPersonEmailsInput): Promise<SetPersonEmailsResult> {
  const person = await reads.findPerson(input.personId);
  if (!person) throw new ApplicationError("not_found", "Person not found");

  const drafts = input.emails.map((email, index) => ({ email, normalizedEmail: normalizeEmail(email), isPrimary: index === 0 }));
  const taken = (await reads.findEmailOwners(drafts.map((draft) => draft.normalizedEmail))).find((owner) => owner.personId !== person.id);
  if (taken) throw new ApplicationError("conflict", `That email already belongs to "${taken.fullName}" (person ${taken.personId}).`, "email_taken");

  const current = await reads.listEmails(person.id);
  if (current.length === drafts.length && current.every((row, index) => row.normalizedEmail === drafts[index]?.normalizedEmail)) {
    return { personId: person.id, emails: current.map((row) => row.email), changed: false, auditEventId: null };
  }

  const auditEventId = await commands.replaceEmails(person.id, drafts, toAuditEvent(actor, {
    action: "person.emails_set",
    entityType: "person",
    entityId: person.id,
    summary: `Set ${drafts.length} email(s) on "${person.fullName}"`,
    metadata: { before: current.length, after: drafts.length }
  }));

  return { personId: person.id, emails: input.emails, changed: true, auditEventId };
}
