export type NoteView = Readonly<{ id: string; body: string; createdAt: string }>;

/** `auditEventId` is null when an identical note already existed and nothing was written. */
export type AddNoteResult = Readonly<{ noteId: string; created: boolean; auditEventId: string | null }>;
