import { v7 as uuidv7 } from "uuid";
import { requireActiveFolder } from "@/modules/library/application/document-guards";
import { commitWithStoredBlob } from "@/modules/library/application/text-version-storage";
import type { DocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import type { DocumentUploadMetadata } from "@/modules/library/domain/file-upload";
import { buildUploadedVersionDraft, sha256HexBytes } from "@/modules/library/domain/file-upload";
import type { StoredVersionResult } from "@/modules/library/domain/document.types";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { DocumentBlobStore } from "@/shared/blob/document-blob-store";

type CreateFileDocumentDependencies = Readonly<{
  documents: Pick<DocumentCommandsRepository, "ensureTags" | "insertDocumentWithVersion">;
  folders: Pick<import("@/modules/library/data/folder.repository").FolderRepository, "findFolder">;
  blobStore: Pick<DocumentBlobStore, "saveBytes" | "remove">;
  resolveOwnerUserId: () => Promise<string>;
}>;

export async function createFileDocument({ documents, folders, blobStore, resolveOwnerUserId }: CreateFileDocumentDependencies, actor: AuthenticatedActor, metadata: DocumentUploadMetadata, file: Readonly<{ filename: string; mimeType: string; bytes: Uint8Array }>): Promise<StoredVersionResult> {
  if (metadata.folderId) await requireActiveFolder(folders, metadata.folderId);

  const documentId = uuidv7();
  const createdBy = await resolveOwnerUserId();
  const draftBase = buildUploadedVersionDraft({ documentId, filename: file.filename, mimeType: file.mimeType, bytes: file.bytes, createdBy });
  const draft = { ...draftBase, checksumSha256: await sha256HexBytes(file.bytes) };
  const tagIds = (await documents.ensureTags(metadata.tags)).map((tag) => tag.id);

  const body = new Uint8Array(file.bytes).buffer;
  if (!blobStore.saveBytes) throw new Error("Binary blob storage is not configured");
  await blobStore.saveBytes(draft.blobKey, body, draft.mimeType);
  let auditEventId: string;
  try {
    auditEventId = await documents.insertDocumentWithVersion({
    documentId,
    title: metadata.title,
    description: metadata.description ?? null,
    category: metadata.category,
    folderId: metadata.folderId ?? null,
    tagIds,
    version: draft,
    audit: toAuditEvent(actor, {
      action: "document.created",
      entityType: "document",
      entityId: documentId,
      summary: `Uploaded ${metadata.category.replaceAll("_", " ")} "${metadata.title}"`,
      metadata: { category: metadata.category, folderId: metadata.folderId ?? null, tagCount: tagIds.length, mimeType: draft.mimeType, sizeBytes: draft.sizeBytes, checksumSha256: draft.checksumSha256 }
    })
    });
  } catch (error) {
    await blobStore.remove(draft.blobKey).catch(() => undefined);
    throw error;
  }

  return { documentId, versionId: draft.versionId, versionNumber: 1, created: true, auditEventId };
}
