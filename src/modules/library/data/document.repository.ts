import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { buildDocumentConditions } from "@/modules/library/data/document-filters";
import { afterCursor, documentOrderBy, sortKeyExpression } from "@/modules/library/data/document-ordering";
import type { DocumentSort } from "@/modules/library/domain/document-sort";
import type { KeysetCursor } from "@/shared/api/keyset";
import type { LibraryFilters } from "@/modules/library/domain/document.schema";
import type { getDatabase } from "@/shared/db/client";
import { organizations, people, prospects, routes } from "@/shared/db/schema/core";
import { campaigns } from "@/shared/db/schema/strategy";
import { documentLinks, documents, documentSearchText, documentVersions, folders, tagLinks, tags } from "@/shared/db/schema/library";

type LibraryDatabase = ReturnType<typeof getDatabase>;

export type DocumentListCriteria = LibraryFilters & Readonly<{ limit: number; cursor?: KeysetCursor<DocumentSort> }>;

// Columns of the current version, joined onto every document projection.
const currentFileColumns = {
  versionNumber: documentVersions.versionNumber,
  mimeType: documentVersions.mimeType,
  sizeBytes: documentVersions.sizeBytes,
  originalFilename: documentVersions.originalFilename,
  extractionStatus: documentVersions.extractionStatus
};

export function createDocumentRepository(database: LibraryDatabase) {
  const prospectPeople = alias(people, "prospect_people");
  const prospectOrganizations = alias(organizations, "prospect_organizations");

  return {
    // Fetches one row beyond the page size so the service can tell whether another page exists without counting.
    listDocuments: (query: DocumentListCriteria) =>
      database.select({ id: documents.id, title: documents.title, category: documents.category, updatedAt: documents.updatedAt, sortKey: sortKeyExpression(query.sort), ...currentFileColumns }).from(documents)
        .leftJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
        .where(and(buildDocumentConditions(query), query.cursor ? afterCursor(query.cursor) : undefined))
        .orderBy(...documentOrderBy(query.sort))
        .limit(query.limit + 1),

    countDocuments: async (filters: LibraryFilters) => {
      const [row] = await database.select({ total: count() }).from(documents).where(buildDocumentConditions(filters));
      return row?.total ?? 0;
    },

    listTagNames: async (documentIds: readonly string[]): Promise<ReadonlyMap<string, readonly string[]>> => {
      if (documentIds.length === 0) return new Map();

      const rows = await database.select({ documentId: tagLinks.documentId, name: tags.name }).from(tagLinks)
        .innerJoin(tags, eq(tags.id, tagLinks.tagId))
        .where(inArray(tagLinks.documentId, [...documentIds]))
        .orderBy(asc(tags.normalizedName));

      const namesByDocument = new Map<string, string[]>();
      for (const row of rows) {
        if (row.documentId === null) continue;
        namesByDocument.set(row.documentId, [...(namesByDocument.get(row.documentId) ?? []), row.name]);
      }
      return namesByDocument;
    },

    findDocument: async (id: string) => {
      const [row] = await database.select({ id: documents.id, title: documents.title, description: documents.description, category: documents.category, folderId: documents.folderId, updatedAt: documents.updatedAt, ...currentFileColumns }).from(documents)
        .leftJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
        .where(and(eq(documents.id, id), isNull(documents.archivedAt)))
        .limit(1);
      return row ?? null;
    },

    listVersions: (documentId: string) =>
      database.select({ id: documentVersions.id, versionNumber: documentVersions.versionNumber, originalFilename: documentVersions.originalFilename, mimeType: documentVersions.mimeType, sizeBytes: documentVersions.sizeBytes, changeNote: documentVersions.changeNote, createdAt: documentVersions.createdAt }).from(documentVersions)
        .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.uploadStatus, "uploaded")))
        .orderBy(desc(documentVersions.versionNumber)),

    listLinks: (documentId: string) =>
      database.select({
        id: documentLinks.id,
        relation: documentLinks.relation,
        personId: documentLinks.personId,
        personName: people.fullName,
        organizationId: documentLinks.organizationId,
        organizationName: organizations.name,
        routeId: documentLinks.routeId,
        routeName: routes.name,
        campaignId: documentLinks.campaignId,
        campaignName: campaigns.name,
        prospectId: documentLinks.prospectId,
        prospectPersonName: prospectPeople.fullName,
        prospectOrganizationName: prospectOrganizations.name
      }).from(documentLinks)
        .leftJoin(people, eq(people.id, documentLinks.personId))
        .leftJoin(organizations, eq(organizations.id, documentLinks.organizationId))
        .leftJoin(routes, eq(routes.id, documentLinks.routeId))
        .leftJoin(campaigns, eq(campaigns.id, documentLinks.campaignId))
        .leftJoin(prospects, eq(prospects.id, documentLinks.prospectId))
        .leftJoin(prospectPeople, eq(prospectPeople.id, prospects.personId))
        .leftJoin(prospectOrganizations, eq(prospectOrganizations.id, prospects.organizationId))
        .where(eq(documentLinks.documentId, documentId))
        .orderBy(asc(documentLinks.createdAt), asc(documentLinks.id)),

    findCurrentFile: async (documentId: string) => {
      const [row] = await database.select({ blobKey: documentVersions.blobKey, originalFilename: documentVersions.originalFilename, mimeType: documentVersions.mimeType }).from(documents)
        .innerJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
        .where(and(eq(documents.id, documentId), isNull(documents.archivedAt), eq(documentVersions.uploadStatus, "uploaded")))
        .limit(1);
      return row ?? null;
    },

    /** `null` means no such active document; a row with `extractedText: null` means it has no readable text (yet). */
    findCurrentText: async (documentId: string) => {
      const [row] = await database.select({ documentId: documents.id, extractedText: documentSearchText.extractedText }).from(documents)
        .leftJoin(documentSearchText, eq(documentSearchText.documentVersionId, documents.currentVersionId))
        .where(and(eq(documents.id, documentId), isNull(documents.archivedAt)))
        .limit(1);
      return row ?? null;
    },

    listFolders: () =>
      database.select({ id: folders.id, parentId: folders.parentId, name: folders.name, depth: folders.depth }).from(folders)
        .where(isNull(folders.archivedAt)),

    countByCategory: () =>
      database.select({ category: documents.category, count: count() }).from(documents)
        .where(isNull(documents.archivedAt))
        .groupBy(documents.category),

    countByTag: () =>
      database.select({ id: tags.id, name: tags.name, count: count() }).from(tagLinks)
        .innerJoin(tags, eq(tags.id, tagLinks.tagId))
        .innerJoin(documents, eq(documents.id, tagLinks.documentId))
        .where(isNull(documents.archivedAt))
        .groupBy(tags.id, tags.name)
        .orderBy(desc(count()), asc(tags.normalizedName))
        .limit(100)
  };
}

export type DocumentRepository = ReturnType<typeof createDocumentRepository>;
