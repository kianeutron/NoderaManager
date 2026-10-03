import { requireActiveDocument, requireActiveFolder } from "@/modules/library/application/document-guards";
import type { DocumentCommandsRepository, DocumentPatch } from "@/modules/library/data/document-commands.repository";
import type { FolderRepository } from "@/modules/library/data/folder.repository";
import type { UpdateDocumentInput } from "@/modules/library/domain/document-commands.schema";
import type { UpdateDocumentResult } from "@/modules/library/domain/document.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";

type UpdateDocumentDependencies = Readonly<{
  documents: Pick<DocumentCommandsRepository, "findDocumentState" | "updateDocument">;
  folders: Pick<FolderRepository, "findFolder">;
}>;

/** Keeps only the fields that actually differ, so a repeated or empty edit changes nothing and writes no audit event. */
function pickChanges(current: Awaited<ReturnType<typeof requireActiveDocument>>, input: UpdateDocumentInput): DocumentPatch {
  return {
    ...(input.title !== undefined && input.title !== current.title ? { title: input.title } : {}),
    ...(input.description !== undefined && input.description !== current.description ? { description: input.description } : {}),
    ...(input.category !== undefined && input.category !== current.category ? { category: input.category } : {}),
    ...(input.folderId !== undefined && input.folderId !== current.folderId ? { folderId: input.folderId } : {})
  };
}

export async function updateDocument({ documents, folders }: UpdateDocumentDependencies, actor: AuthenticatedActor, input: UpdateDocumentInput): Promise<UpdateDocumentResult> {
  const current = await requireActiveDocument(documents, input.documentId);
  const changes = pickChanges(current, input);
  const fields = Object.keys(changes);
  if (fields.length === 0) return { documentId: current.id, changed: false, auditEventId: null };

  if (changes.folderId) await requireActiveFolder(folders, changes.folderId);

  // The description body is deliberately left out of the audit trail; only that it changed is recorded.
  const auditEventId = await documents.updateDocument(current.id, changes, toAuditEvent(actor, {
    action: "document.updated",
    entityType: "document",
    entityId: current.id,
    summary: `Updated ${fields.join(", ")} of "${current.title}"`,
    metadata: {
      fields,
      before: { title: current.title, category: current.category, folderId: current.folderId },
      after: { title: changes.title ?? current.title, category: changes.category ?? current.category, folderId: changes.folderId === undefined ? current.folderId : changes.folderId }
    }
  }));

  return { documentId: current.id, changed: true, auditEventId };
}
