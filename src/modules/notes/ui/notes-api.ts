import { hc } from "hono/client";
import type { NotesRoutes } from "@/modules/notes/api/notes.routes";
import type { AddNoteInput } from "@/modules/notes/domain/note.schema";
import { toApiRequestError } from "@/shared/api/api-request-error";

// Created on demand: the absolute base URL only exists in the browser.
const notesClient = () => hc<NotesRoutes>(`${window.location.origin}/api/notes`);

export async function addNote(input: AddNoteInput) {
  const response = await notesClient().index.$post({ json: input });
  if (!response.ok) throw await toApiRequestError(response);
  return response.json();
}
