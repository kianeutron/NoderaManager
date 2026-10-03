import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { DocumentCategory } from "@/modules/library/domain/document.schema";
import { normalizeText } from "@/shared/lib/normalize-text";
import type { getDatabase } from "@/shared/db/client";
import { documents, documentSearchText, documentVersions, tagLinks, tags } from "@/shared/db/schema/library";

type LibraryDatabase = ReturnType<typeof getDatabase>;

/** A tag as persisted: the display name keeps whichever spelling created it first. */
export type StoredTag = Readonly<{ id: string; name: string }>;

export type VersionDraft = Readonly<{
  versionId: string;
  blobKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  extractedText: string;
  createdBy: string;
  extractionStatus?: "ready" | "skipped";
}>;

export type NewDocumentDraft = Readonly<{
  documentId: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  folderId: string | null;
  tagIds: readonly string[];
  version: VersionDraft;
  audit: AuditEventInput;
}>;

export type NewVersionDraft = Readonly<{ documentId: string; versionNumber: number; version: VersionDraft; changeNote: string | null; audit: AuditEventInput }>;
export type ArchiveChange = Readonly<{ archivedAt: Date | null; folderId?: null }>;
export type DocumentPatch = Readonly<{ title?: string; description?: string | null; category?: DocumentCategory; folderId?: string | null }>;

/**
 * Every command is one `batch`: the mutation and its audit event commit together or not at all.
 * Commands return the audit event id so callers can hand a reference back to the client.
 */
export function createDocumentCommandsRepository(database: LibraryDatabase) {
  const versionRows = (draft: VersionDraft, documentId: string, versionNumber: number, changeNote: string | null) => ({
    version: database.insert(documentVersions).values({
      id: draft.versionId, documentId, versionNumber, blobKey: draft.blobKey, originalFilename: draft.originalFilename, mimeType: draft.mimeType,
      sizeBytes: draft.sizeBytes, checksumSha256: draft.checksumSha256, uploadStatus: "uploaded", uploadedAt: new Date(), extractionStatus: draft.extractionStatus ?? "ready", changeNote, createdBy: draft.createdBy
    }),
    searchText: database.insert(documentSearchText).values({ documentVersionId: draft.versionId, documentId, extractedText: draft.extractedText })
  });

  return {
    findDocumentState: async (id: string) => {
      const [row] = await database.select({
        id: documents.id, title: documents.title, description: documents.description, category: documents.category, folderId: documents.folderId, archivedAt: documents.archivedAt,
        currentVersionId: documentVersions.id, currentVersionNumber: documentVersions.versionNumber, currentMimeType: documentVersions.mimeType, currentFilename: documentVersions.originalFilename, currentChecksum: documentVersions.checksumSha256
      }).from(documents).leftJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId)).where(eq(documents.id, id)).limit(1);
      return row ?? null;
    },

    /** Idempotency for creates: an active document with the same title and identical current content is the same document. */
    findReusableDocument: async (title: string, checksumSha256: string) => {
      const [row] = await database.select({ documentId: documents.id, versionId: documentVersions.id, versionNumber: documentVersions.versionNumber }).from(documents)
        .innerJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
        .where(and(isNull(documents.archivedAt), sql`lower(${documents.title}) = lower(${title})`, eq(documentVersions.checksumSha256, checksumSha256)))
        .limit(1);
      return row ?? null;
    },

    nextVersionNumber: async (documentId: string) => {
      const [row] = await database.select({ latest: sql<number>`coalesce(max(${documentVersions.versionNumber}), 0)`.mapWith(Number) }).from(documentVersions).where(eq(documentVersions.documentId, documentId));
      return (row?.latest ?? 0) + 1;
    },

    /** Creates missing tags (racing creators are harmless) and returns them as stored, in input order. Unused tags are cleaned up by maintenance, never by cascade. */
    ensureTags: async (names: readonly string[]): Promise<StoredTag[]> => {
      if (names.length === 0) return [];
      const rows = names.map((name) => ({ name, normalizedName: normalizeText(name) }));
      await database.insert(tags).values(rows).onConflictDoNothing({ target: tags.normalizedName });

      const found = await database.select({ id: tags.id, name: tags.name, normalizedName: tags.normalizedName }).from(tags).where(inArray(tags.normalizedName, rows.map((row) => row.normalizedName)));
      const byNormalizedName = new Map(found.map((tag) => [tag.normalizedName, tag]));
      return rows.map((row) => {
        const tag = byNormalizedName.get(row.normalizedName);
        if (!tag) throw new Error("Tag was not found after being created");
        return { id: tag.id, name: tag.name };
      });
    },

    insertDocumentWithVersion: async (draft: NewDocumentDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, draft.audit);
      const { version, searchText } = versionRows(draft.version, draft.documentId, 1, null);
      await database.batch([
        database.insert(documents).values({ id: draft.documentId, title: draft.title, description: draft.description, category: draft.category, folderId: draft.folderId, createdBy: draft.version.createdBy }),
        version,
        database.update(documents).set({ currentVersionId: draft.version.versionId }).where(eq(documents.id, draft.documentId)),
        searchText,
        ...(draft.tagIds.length > 0 ? [database.insert(tagLinks).values(draft.tagIds.map((tagId) => ({ tagId, documentId: draft.documentId })))] : []),
        audit.statement
      ]);
      return audit.id;
    },

    insertVersion: async (draft: NewVersionDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, draft.audit);
      const { version, searchText } = versionRows(draft.version, draft.documentId, draft.versionNumber, draft.changeNote);
      await database.batch([
        version,
        searchText,
        database.update(documents).set({ currentVersionId: draft.version.versionId, updatedAt: new Date() }).where(eq(documents.id, draft.documentId)),
        audit.statement
      ]);
      return audit.id;
    },

    updateDocument: async (documentId: string, patch: DocumentPatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(documents).set({ ...patch, updatedAt: new Date() }).where(eq(documents.id, documentId)), audit.statement]);
      return audit.id;
    },

    replaceTags: async (documentId: string, tagIds: readonly string[], auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.delete(tagLinks).where(and(eq(tagLinks.documentId, documentId), tagIds.length > 0 ? notInArray(tagLinks.tagId, [...tagIds]) : undefined)),
        ...(tagIds.length > 0 ? [database.insert(tagLinks).values(tagIds.map((tagId) => ({ tagId, documentId }))).onConflictDoNothing()] : []),
        database.update(documents).set({ updatedAt: new Date() }).where(eq(documents.id, documentId)),
        audit.statement
      ]);
      return audit.id;
    },

    /** `folderId: null` lets a restore drop a folder that was archived while the document was hidden. */
    setArchived: async (documentId: string, change: ArchiveChange, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(documents).set({ ...change, updatedAt: new Date() }).where(eq(documents.id, documentId)), audit.statement]);
      return audit.id;
    }
  };
}

export type DocumentCommandsRepository = ReturnType<typeof createDocumentCommandsRepository>;
