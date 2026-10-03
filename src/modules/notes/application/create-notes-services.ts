import { addNote } from "@/modules/notes/application/add-note.service";
import { createNoteRepository } from "@/modules/notes/data/note.repository";
import type { AddNoteInput } from "@/modules/notes/domain/note.schema";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createNotesServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const notes = createNoteRepository(database);

  return {
    addNote: (actor: AuthenticatedActor, input: AddNoteInput) => addNote({ notes }, actor, input)
  };
}

export type NotesServices = ReturnType<typeof createNotesServices>;
