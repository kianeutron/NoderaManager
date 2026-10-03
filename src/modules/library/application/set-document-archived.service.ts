import type { DocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import type { FolderRepository } from "@/modules/library/data/folder.repository";
import type { DocumentIdInput } from "@/modules/library/domain/document-commands.schema";
import type { SetDocumentArchivedResult } from "@/modules/library/domain/document.types";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";

type SetDocumentArchivedDependencies = Readonly<{
  documents: Pick<DocumentCommandsRepository, "findDocumentState" | "setArchived">;
  folders: Pick<FolderRepository, "findFolder">;
}>;

async function changeArchivedState({ documents, folders }: SetDocumentArchivedDependencies, actor: AuthenticatedActor, { documentId }: DocumentIdInput, archived: boolean): Promise<SetDocumentArchivedResult> {
  const document = await documents.findDocumentState(documentId);
  if (!document) throw new LibraryCommandError("not_found", "Document not found");
  if ((document.archivedAt !== null) === archived) return { documentId, archived, changed: false, auditEventId: null };

  // A folder archived while the document was hidden cannot receive it back, so it returns to Unfiled.
  const folder = !archived && document.folderId ? await folders.findFolder(document.folderId) : null;
  const unfile = folder !== null && folder.archivedAt !== null;

  const auditEventId = await documents.setArchived(documentId, { archivedAt: archived ? new Date() : null, ...(unfile ? { folderId: null } : {}) }, toAuditEvent(actor, {
    action: archived ? "document.archived" : "document.restored",
    entityType: "document",
    entityId: documentId,
    summary: `${archived ? "Archived" : "Restored"} "${document.title}"`,
    metadata: unfile ? { unfiled: true } : {}
  }));

  return { documentId, archived, changed: true, auditEventId };
}

/** The reversible way to remove a document from normal views; nothing is ever deleted. Idempotent. */
export function archiveDocument(dependencies: SetDocumentArchivedDependencies, actor: AuthenticatedActor, input: DocumentIdInput) {
  return changeArchivedState(dependencies, actor, input, true);
}

export function restoreDocument(dependencies: SetDocumentArchivedDependencies, actor: AuthenticatedActor, input: DocumentIdInput) {
  return changeArchivedState(dependencies, actor, input, false);
}
