import type { DocumentRepository } from "@/modules/library/data/document.repository";
import { resolveContentDisposition, resolveServedContentType, type ContentDisposition } from "@/modules/library/domain/file-delivery";
import type { DocumentBlobStore } from "@/shared/blob/document-blob-store";

type OpenFileDependencies = Readonly<{
  repository: Pick<DocumentRepository, "findCurrentFile">;
  blobStore: Pick<DocumentBlobStore, "open">;
}>;

export type OpenedDocumentFile = Readonly<{
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  disposition: ContentDisposition;
  filename: string;
}>;

/** Resolves the current version of a document and opens its private bytes. `null` means there is nothing to serve. */
export async function openDocumentFile({ repository, blobStore }: OpenFileDependencies, documentId: string, requested: ContentDisposition): Promise<OpenedDocumentFile | null> {
  const file = await repository.findCurrentFile(documentId);
  if (!file) return null;

  const stream = await blobStore.open(file.blobKey);
  if (!stream) return null;

  return {
    stream,
    contentType: resolveServedContentType(file.mimeType),
    disposition: resolveContentDisposition(file.mimeType, requested),
    filename: file.originalFilename
  };
}
