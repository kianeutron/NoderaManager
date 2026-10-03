import { createNotesServices } from "@/modules/notes/application/create-notes-services";
import { getDatabase } from "@/shared/db/client";

export function getNotesServices() {
  return createNotesServices({ database: getDatabase() });
}
