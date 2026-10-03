import { and, desc, eq } from "drizzle-orm";
import type { NoteTarget } from "@/modules/notes/domain/note.schema";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { organizations, people, prospects } from "@/shared/db/schema/core";
import { noteLinks, notes } from "@/shared/db/schema/notes";

type NotesDatabase = ReturnType<typeof getDatabase>;

export type NewNoteDraft = Readonly<{ noteId: string; body: string; targets: readonly NoteTarget[]; audit: AuditEventInput }>;

const targetColumns = { person: noteLinks.personId, organization: noteLinks.organizationId, prospect: noteLinks.prospectId } as const;
const targetTables = { person: people, organization: organizations, prospect: prospects } as const;

function linkValues({ targetType, targetId }: NoteTarget) {
  return {
    personId: targetType === "person" ? targetId : null,
    organizationId: targetType === "organization" ? targetId : null,
    prospectId: targetType === "prospect" ? targetId : null
  };
}

export function createNoteRepository(database: NotesDatabase) {
  return {
    targetExists: async ({ targetType, targetId }: NoteTarget): Promise<boolean> => {
      const table = targetTables[targetType];
      const [row] = await database.select({ id: table.id }).from(table).where(eq(table.id, targetId)).limit(1);
      return row !== undefined;
    },

    /** Newest first. Detail views of people, organizations and prospects show these. */
    listNotes: (target: NoteTarget, limit: number) =>
      database.select({ id: notes.id, body: notes.body, createdAt: notes.createdAt }).from(noteLinks)
        .innerJoin(notes, eq(notes.id, noteLinks.noteId))
        .where(eq(targetColumns[target.targetType], target.targetId))
        .orderBy(desc(notes.createdAt), desc(notes.id))
        .limit(limit),

    findNoteWithBody: async (body: string, target: NoteTarget) => {
      const [row] = await database.select({ id: notes.id }).from(noteLinks)
        .innerJoin(notes, eq(notes.id, noteLinks.noteId))
        .where(and(eq(targetColumns[target.targetType], target.targetId), eq(notes.body, body)))
        .limit(1);
      return row ?? null;
    },

    insertNote: async ({ noteId, body, targets, audit: auditInput }: NewNoteDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.insert(notes).values({ id: noteId, body }),
        database.insert(noteLinks).values(targets.map((target) => ({ noteId, ...linkValues(target) }))),
        audit.statement
      ]);
      return audit.id;
    }
  };
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
