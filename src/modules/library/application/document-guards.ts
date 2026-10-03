import type { DocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import type { FolderRepository } from "@/modules/library/data/folder.repository";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";

/** Loads a document that is visible in normal views. Archived documents are read-only until restored. */
export async function requireActiveDocument(repository: Pick<DocumentCommandsRepository, "findDocumentState">, documentId: string) {
  const state = await repository.findDocumentState(documentId);
  if (!state || state.archivedAt !== null) throw new LibraryCommandError("not_found", "Document not found");
  return state;
}

export async function requireActiveFolder(repository: Pick<FolderRepository, "findFolder">, folderId: string) {
  const folder = await repository.findFolder(folderId);
  if (!folder || folder.archivedAt !== null) throw new LibraryCommandError("not_found", "Folder not found");
  return folder;
}
