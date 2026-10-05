import { and, eq } from "drizzle-orm";
import type { getDatabase } from "@/shared/db/client";
import { bulkOutreachImports } from "@/shared/db/schema/imports";

type BulkImportDatabase = ReturnType<typeof getDatabase>;

export function createBulkImportRepository(database: BulkImportDatabase) {
  return {
    create: async (input: Readonly<{
      id: string;
      actorId: string;
      source: string;
      requestFingerprint: string;
      payload: unknown;
      plan: unknown;
      expiresAt: Date;
    }>) => {
      await database.insert(bulkOutreachImports).values(input as typeof bulkOutreachImports.$inferInsert);
      return input.id;
    },

    findForActor: async (id: string, actorId: string, source: string) => {
      const [row] = await database.select().from(bulkOutreachImports).where(and(eq(bulkOutreachImports.id, id), eq(bulkOutreachImports.actorId, actorId), eq(bulkOutreachImports.source, source))).limit(1);
      return row ?? null;
    },

    findForActorByFingerprint: async (actorId: string, source: string, requestFingerprint: string) => {
      const [row] = await database.select().from(bulkOutreachImports).where(and(eq(bulkOutreachImports.actorId, actorId), eq(bulkOutreachImports.source, source), eq(bulkOutreachImports.requestFingerprint, requestFingerprint))).limit(1);
      return row ?? null;
    },

    updateResult: async (id: string, status: string, result: unknown, commitIdempotencyKey: string) => {
      await database.update(bulkOutreachImports).set({ status, result, commitIdempotencyKey, committedAt: new Date(), updatedAt: new Date() }).where(eq(bulkOutreachImports.id, id));
    }
  };
}

export type BulkImportRepository = ReturnType<typeof createBulkImportRepository>;
