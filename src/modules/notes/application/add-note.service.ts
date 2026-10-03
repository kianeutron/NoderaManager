import { v7 as uuidv7 } from "uuid";
import type { NoteRepository } from "@/modules/notes/data/note.repository";
import type { AddNoteInput } from "@/modules/notes/domain/note.schema";
import type { AddNoteResult } from "@/modules/notes/domain/note.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import { ApplicationError } from "@/shared/errors/application-error";

type AddNoteDependencies = Readonly<{ notes: Pick<NoteRepository, "targetExists" | "findNoteWithBody" | "insertNote"> }>;

/** Idempotent: repeating the same text on the same first record returns the existing note instead of a duplicate. */
export async function addNote({ notes }: AddNoteDependencies, actor: AuthenticatedActor, input: AddNoteInput): Promise<AddNoteResult> {
  for (const target of input.targets) {
    if (!(await notes.targetExists(target))) throw new ApplicationError("not_found", `The ${target.targetType} to attach the note to was not found`);
  }

  const [firstTarget] = input.targets;
  const existing = firstTarget ? await notes.findNoteWithBody(input.body, firstTarget) : null;
  if (existing) return { noteId: existing.id, created: false, auditEventId: null };

  const noteId = uuidv7();
  // The note text is deliberately not copied into the audit trail.
  const auditEventId = await notes.insertNote({
    noteId,
    body: input.body,
    targets: input.targets,
    audit: toAuditEvent(actor, { action: "note.added", entityType: "note", entityId: noteId, summary: `Added a note to ${input.targets.length} record(s)`, metadata: { targets: input.targets, length: input.body.length } })
  });

  return { noteId, created: true, auditEventId };
}
