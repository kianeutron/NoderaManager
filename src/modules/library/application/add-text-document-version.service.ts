import { requireActiveDocument } from "@/modules/library/application/document-guards";
import { buildTextVersionDraft, commitWithStoredBlob } from "@/modules/library/application/text-version-storage";
import type { DocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import type { AddTextDocumentVersionInput } from "@/modules/library/domain/document-commands.schema";
import type { StoredVersionResult } from "@/modules/library/domain/document.types";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";
import { buildTextFilename, sha256Hex, textFormatForMimeType } from "@/modules/library/domain/text-content";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { DocumentBlobStore } from "@/shared/blob/document-blob-store";

type AddTextVersionDependencies = Readonly<{
  documents: Pick<DocumentCommandsRepository, "findDocumentState" | "nextVersionNumber" | "insertVersion">;
  blobStore: Pick<DocumentBlobStore, "save" | "remove">;
  resolveOwnerUserId: () => Promise<string>;
}>;

/** Adds a revision to a text document. Older versions stay untouched; identical content is not stored twice. */
export async function addTextDocumentVersion({ documents, blobStore, resolveOwnerUserId }: AddTextVersionDependencies, actor: AuthenticatedActor, input: AddTextDocumentVersionInput): Promise<StoredVersionResult> {
  const document = await requireActiveDocument(documents, input.documentId);
  const format = document.currentMimeType === null ? null : textFormatForMimeType(document.currentMimeType);
  if (!format || document.currentVersionId === null || document.currentVersionNumber === null) {
    throw new LibraryCommandError("unsupported", "Only markdown and plain-text documents can receive new text versions");
  }

  const checksumSha256 = await sha256Hex(input.content);
  if (checksumSha256 === document.currentChecksum) {
    return { documentId: document.id, versionId: document.currentVersionId, versionNumber: document.currentVersionNumber, created: false, auditEventId: null };
  }

  const versionNumber = await documents.nextVersionNumber(document.id);
  const draft = buildTextVersionDraft({ documentId: document.id, filename: document.currentFilename ?? buildTextFilename(document.title, format), format, content: input.content, checksumSha256, createdBy: await resolveOwnerUserId() });

  const auditEventId = await commitWithStoredBlob(blobStore, draft, input.content, () => documents.insertVersion({
    documentId: document.id,
    versionNumber,
    version: draft,
    changeNote: input.changeNote ?? null,
    audit: toAuditEvent(actor, {
      action: "document.version_added",
      entityType: "document",
      entityId: document.id,
      summary: `Added version ${versionNumber} to "${document.title}"`,
      metadata: { versionNumber, sizeBytes: draft.sizeBytes, checksumSha256 }
    })
  }));

  return { documentId: document.id, versionId: draft.versionId, versionNumber, created: true, auditEventId };
}
