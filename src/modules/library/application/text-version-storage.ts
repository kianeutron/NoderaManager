import { v7 as uuidv7 } from "uuid";
import type { VersionDraft } from "@/modules/library/data/document-commands.repository";
import { createBlobKey, mimeTypeForFormat, type TextFormat } from "@/modules/library/domain/text-content";
import type { DocumentBlobStore } from "@/shared/blob/document-blob-store";

type TextVersionInput = Readonly<{ documentId: string; filename: string; format: TextFormat; content: string; checksumSha256: string; createdBy: string }>;

/** Everything needed to store one text version. Text is indexed as-is, so its extraction is already `ready`. */
export function buildTextVersionDraft({ documentId, filename, format, content, checksumSha256, createdBy }: TextVersionInput): VersionDraft {
  const versionId = uuidv7();
  return {
    versionId,
    blobKey: createBlobKey(documentId, versionId),
    originalFilename: filename,
    mimeType: mimeTypeForFormat(format),
    sizeBytes: new TextEncoder().encode(content).byteLength,
    checksumSha256,
    extractedText: content,
    createdBy
  };
}

/**
 * Blob storage and Postgres cannot share a transaction, so bytes are written first and removed again if the
 * database commit fails. If that cleanup fails too, the original error still surfaces and the orphan is
 * found later by the blob manifest check.
 */
export async function commitWithStoredBlob<Result>(blobStore: Pick<DocumentBlobStore, "save" | "remove">, draft: VersionDraft, content: string, commit: () => Promise<Result>): Promise<Result> {
  await blobStore.save(draft.blobKey, content, draft.mimeType);
  try {
    return await commit();
  } catch (error) {
    await blobStore.remove(draft.blobKey).catch(() => undefined);
    throw error;
  }
}
