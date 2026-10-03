import { addTextDocumentVersion } from "@/modules/library/application/add-text-document-version.service";
import { createTextDocument } from "@/modules/library/application/create-text-document.service";
import { createFileDocument } from "@/modules/library/application/create-file-document.service";
import { linkDocument, unlinkDocument } from "@/modules/library/application/document-links.service";
import { archiveFolder, createFolder, renameFolder } from "@/modules/library/application/folder-commands.service";
import { getDocument } from "@/modules/library/application/get-document.service";
import { getDocumentText } from "@/modules/library/application/get-document-text.service";
import { getLibraryFacets } from "@/modules/library/application/get-library-facets.service";
import { listDocuments } from "@/modules/library/application/list-documents.service";
import { openDocumentFile } from "@/modules/library/application/open-document-file.service";
import { archiveDocument, restoreDocument } from "@/modules/library/application/set-document-archived.service";
import { setDocumentTags } from "@/modules/library/application/set-document-tags.service";
import { updateDocument } from "@/modules/library/application/update-document.service";
import { createDocumentCommandsRepository } from "@/modules/library/data/document-commands.repository";
import { createDocumentLinkRepository } from "@/modules/library/data/document-link.repository";
import { createDocumentRepository } from "@/modules/library/data/document.repository";
import { createFolderRepository } from "@/modules/library/data/folder.repository";
import type { AddTextDocumentVersionInput, CreateTextDocumentInput, DocumentIdInput, DocumentTextInput, LinkDocumentInput, SetDocumentTagsInput, UnlinkDocumentInput, UpdateDocumentInput } from "@/modules/library/domain/document-commands.schema";
import type { DocumentListQuery } from "@/modules/library/domain/document.schema";
import type { ArchiveFolderInput, CreateFolderInput, RenameFolderInput } from "@/modules/library/domain/folder-commands.schema";
import type { ContentDisposition } from "@/modules/library/domain/file-delivery";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { DocumentBlobStore } from "@/shared/blob/document-blob-store";
import type { getDatabase } from "@/shared/db/client";

export type LibraryServicesDependencies = Readonly<{
  database: ReturnType<typeof getDatabase>;
  blobStore: DocumentBlobStore;
  /** Only commands that record a creator call this; it should resolve the owner's `users` row. */
  resolveOwnerUserId: () => Promise<string>;
}>;

/** Wires repositories to services. Free of environment access so tests can run it against a test database. Commands take the verified actor first. */
export function createLibraryServices({ database, blobStore, resolveOwnerUserId }: LibraryServicesDependencies) {
  const reads = createDocumentRepository(database);
  const documents = createDocumentCommandsRepository(database);
  const links = createDocumentLinkRepository(database);
  const folders = createFolderRepository(database);

  return {
    listDocuments: (query: DocumentListQuery) => listDocuments(reads, query),
    getDocument: (id: string) => getDocument(reads, id),
    getFacets: () => getLibraryFacets(reads),
    getDocumentText: (input: DocumentTextInput) => getDocumentText(reads, input),
    openDocumentFile: (id: string, requested: ContentDisposition) => openDocumentFile({ repository: reads, blobStore }, id, requested),

    createTextDocument: (actor: AuthenticatedActor, input: CreateTextDocumentInput) => createTextDocument({ documents, folders, blobStore, resolveOwnerUserId }, actor, input),
    createFileDocument: (actor: AuthenticatedActor, metadata: import("@/modules/library/domain/file-upload").DocumentUploadMetadata, file: Readonly<{ filename: string; mimeType: string; bytes: Uint8Array }>) => createFileDocument({ documents, folders, blobStore, resolveOwnerUserId }, actor, metadata, file),
    addTextDocumentVersion: (actor: AuthenticatedActor, input: AddTextDocumentVersionInput) => addTextDocumentVersion({ documents, blobStore, resolveOwnerUserId }, actor, input),
    updateDocument: (actor: AuthenticatedActor, input: UpdateDocumentInput) => updateDocument({ documents, folders }, actor, input),
    setDocumentTags: (actor: AuthenticatedActor, input: SetDocumentTagsInput) => setDocumentTags({ documents, reads }, actor, input),
    archiveDocument: (actor: AuthenticatedActor, input: DocumentIdInput) => archiveDocument({ documents, folders }, actor, input),
    restoreDocument: (actor: AuthenticatedActor, input: DocumentIdInput) => restoreDocument({ documents, folders }, actor, input),
    linkDocument: (actor: AuthenticatedActor, input: LinkDocumentInput) => linkDocument({ documents, links, resolveOwnerUserId }, actor, input),
    unlinkDocument: (actor: AuthenticatedActor, input: UnlinkDocumentInput) => unlinkDocument({ links }, actor, input),
    createFolder: (actor: AuthenticatedActor, input: CreateFolderInput) => createFolder(folders, actor, input),
    renameFolder: (actor: AuthenticatedActor, input: RenameFolderInput) => renameFolder(folders, actor, input),
    archiveFolder: (actor: AuthenticatedActor, input: ArchiveFolderInput) => archiveFolder(folders, actor, input)
  };
}

export type LibraryServices = ReturnType<typeof createLibraryServices>;
