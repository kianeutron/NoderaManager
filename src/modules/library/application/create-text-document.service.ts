import { v7 as uuidv7 } from "uuid";
import { requireActiveFolder } from "@/modules/library/application/document-guards";
import { buildTextVersionDraft, commitWithStoredBlob } from "@/modules/library/application/text-version-storage";
import type { DocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import type { FolderRepository } from "@/modules/library/data/folder.repository";
import type { CreateTextDocumentInput } from "@/modules/library/domain/document-commands.schema";
import type { StoredVersionResult } from "@/modules/library/domain/document.types";
import { buildTextFilename, sha256Hex } from "@/modules/library/domain/text-content";
import { toAuditEvent } from "@/shared/audit/audit-actor";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { DocumentBlobStore } from "@/shared/blob/document-blob-store";

type CreateTextDocumentDependencies = Readonly<{
  documents: Pick<DocumentCommandsRepository, "findReusableDocument" | "ensureTags" | "insertDocumentWithVersion">;
  folders: Pick<FolderRepository, "findFolder">;
  blobStore: Pick<DocumentBlobStore, "save" | "remove">;
  resolveOwnerUserId: () => Promise<string>;
}>;

/**
 * Creates a document whose content is text (notes, research, templates). Idempotent: repeating the call
 * with the same title and identical content returns the existing document instead of a duplicate.
 */
export async function createTextDocument({ documents, folders, blobStore, resolveOwnerUserId }: CreateTextDocumentDependencies, actor: AuthenticatedActor, input: CreateTextDocumentInput): Promise<StoredVersionResult> {
  const checksumSha256 = await sha256Hex(input.content);
  const reusable = await documents.findReusableDocument(input.title, checksumSha256);
  if (reusable) return { ...reusable, created: false, auditEventId: null };

  if (input.folderId) await requireActiveFolder(folders, input.folderId);

  const documentId = uuidv7();
  const draft = buildTextVersionDraft({ documentId, filename: buildTextFilename(input.title, input.format), format: input.format, content: input.content, checksumSha256, createdBy: await resolveOwnerUserId() });
  const tagIds = (await documents.ensureTags(input.tags)).map((tag) => tag.id);

  const auditEventId = await commitWithStoredBlob(blobStore, draft, input.content, () => documents.insertDocumentWithVersion({
    documentId,
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    folderId: input.folderId ?? null,
    tagIds,
    version: draft,
    audit: toAuditEvent(actor, {
      action: "document.created",
      entityType: "document",
      entityId: documentId,
      summary: `Created ${input.category.replaceAll("_", " ")} "${input.title}"`,
      metadata: { category: input.category, folderId: input.folderId ?? null, tagCount: tagIds.length, format: input.format, sizeBytes: draft.sizeBytes, checksumSha256 }
    })
  }));

  return { documentId, versionId: draft.versionId, versionNumber: 1, created: true, auditEventId };
}
