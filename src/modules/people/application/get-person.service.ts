import { toPersonSummary } from "@/modules/people/application/person-views";
import type { NoteRepository } from "@/modules/notes/data/note.repository";
import type { PersonRepository } from "@/modules/people/data/person.repository";
import type { PersonDetail } from "@/modules/people/domain/person.types";

type GetPersonDependencies = Readonly<{
  reads: Pick<PersonRepository, "findPersonIncludingArchived" | "listEmails" | "listLinks" | "listProspects">;
  notes: Pick<NoteRepository, "listNotes">;
}>;

const prospectLimit = 50;
const recentNoteLimit = 10;

export async function getPerson({ reads, notes }: GetPersonDependencies, personId: string): Promise<PersonDetail | null> {
  const person = await reads.findPersonIncludingArchived(personId);
  if (!person) return null;

  const [emails, links, prospects, recentNotes] = await Promise.all([
    reads.listEmails(personId),
    reads.listLinks(personId),
    reads.listProspects(personId, prospectLimit),
    notes.listNotes({ targetType: "person", targetId: personId }, recentNoteLimit)
  ]);

  return {
    ...toPersonSummary(person),
    languages: person.languages,
    linkedinUrl: person.linkedinUrl,
    emails: emails.map(({ email, isPrimary }) => ({ email, isPrimary })),
    links,
    doNotContactAt: person.doNotContactAt?.toISOString() ?? null,
    doNotContactReason: person.doNotContactReason,
    archivedAt: person.archivedAt?.toISOString() ?? null,
    prospects,
    recentNotes: recentNotes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() }))
  };
}
