import type { PersonCommandsRepository } from "@/modules/people/data/person-commands.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import type { SetPersonLinksInput } from "@/modules/people/domain/person.schema";
import type { SetPersonLinksResult } from "@/modules/people/domain/person.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";
import { normalizeWebUrl } from "@/shared/lib/normalize-web-url";

type SetPersonLinksDependencies = Readonly<{
  reads: Pick<PersonRepository, "findPerson" | "listLinks">;
  commands: Pick<PersonCommandsRepository, "replaceLinks">;
}>;

/** Replaces the whole list, which makes the command idempotent: links are compared by normalized URL, type and label. */
export async function setPersonLinks({ reads, commands }: SetPersonLinksDependencies, actor: AuthenticatedActor, input: SetPersonLinksInput): Promise<SetPersonLinksResult> {
  const person = await reads.findPerson(input.personId);
  if (!person) throw new ApplicationError("not_found", "Person not found");

  const drafts = input.links.map((link) => ({ type: link.type, url: link.url, normalizedUrl: normalizeWebUrl(link.url), label: link.label ?? null }));
  const current = new Map((await reads.listLinks(person.id)).map((link) => [normalizeWebUrl(link.url), link]));
  const unchanged = current.size === drafts.length && drafts.every((draft) => {
    const existing = current.get(draft.normalizedUrl);
    return existing !== undefined && existing.type === draft.type && existing.label === draft.label;
  });
  if (unchanged) return { personId: person.id, count: drafts.length, changed: false, auditEventId: null };

  const auditEventId = await commands.replaceLinks(person.id, drafts, toAuditEvent(actor, {
    action: "person.links_set",
    entityType: "person",
    entityId: person.id,
    summary: `Set ${drafts.length} link(s) on "${person.fullName}"`,
    metadata: { before: current.size, after: drafts.length }
  }));

  return { personId: person.id, count: drafts.length, changed: true, auditEventId };
}
