import { and, count, eq, isNull, ne } from "drizzle-orm";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { documents, folders } from "@/shared/db/schema/library";

type LibraryDatabase = ReturnType<typeof getDatabase>;

export type NewFolderDraft = Readonly<{ folderId: string; parentId: string | null; name: string; normalizedName: string; depth: number; audit: AuditEventInput }>;

export function createFolderRepository(database: LibraryDatabase) {
  return {
    findFolder: async (id: string) => {
      const [row] = await database.select({ id: folders.id, parentId: folders.parentId, name: folders.name, normalizedName: folders.normalizedName, depth: folders.depth, archivedAt: folders.archivedAt }).from(folders).where(eq(folders.id, id)).limit(1);
      return row ?? null;
    },

    /** The unique-name rule is per parent among active folders; roots share the null parent. */
    findActiveSibling: async (parentId: string | null, normalizedName: string, excludeFolderId?: string) => {
      const [row] = await database.select({ id: folders.id, name: folders.name, depth: folders.depth }).from(folders)
        .where(and(
          isNull(folders.archivedAt),
          eq(folders.normalizedName, normalizedName),
          parentId === null ? isNull(folders.parentId) : eq(folders.parentId, parentId),
          excludeFolderId ? ne(folders.id, excludeFolderId) : undefined
        ))
        .limit(1);
      return row ?? null;
    },

    countActiveChildren: async (folderId: string) => {
      const [row] = await database.select({ total: count() }).from(folders).where(and(eq(folders.parentId, folderId), isNull(folders.archivedAt)));
      return row?.total ?? 0;
    },

    countActiveDocuments: async (folderId: string) => {
      const [row] = await database.select({ total: count() }).from(documents).where(and(eq(documents.folderId, folderId), isNull(documents.archivedAt)));
      return row?.total ?? 0;
    },

    insertFolder: async ({ audit: auditInput, folderId, ...values }: NewFolderDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.insert(folders).values({ id: folderId, ...values }), audit.statement]);
      return audit.id;
    },

    renameFolder: async (folderId: string, name: string, normalizedName: string, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(folders).set({ name, normalizedName, updatedAt: new Date() }).where(eq(folders.id, folderId)), audit.statement]);
      return audit.id;
    },

    archiveFolder: async (folderId: string, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(folders).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(folders.id, folderId)), audit.statement]);
      return audit.id;
    }
  };
}

export type FolderRepository = ReturnType<typeof createFolderRepository>;
