import { and, eq, gt, sql } from "drizzle-orm";
import type { getDatabase } from "@/shared/db/client";
import { idempotencyKeys } from "@/shared/db/schema/integration";

type IdempotencyDatabase = ReturnType<typeof getDatabase>;

/** What a retried command needs to be recognised: who asked, which command, the caller's key, and what the request said. */
export type IdempotencyEntry = Readonly<{
  operation: string;
  source: string;
  key: string;
  /** Hash of the normalized request, so the same key with a different payload is detected as misuse. */
  fingerprint: string;
  resultEntityType: string;
  resultEntityId: string;
  expiresAt: Date;
}>;

/** A key is remembered for a day: long enough to cover any retry, short enough not to pile up. */
export const idempotencyLifetimeMilliseconds = 24 * 60 * 60 * 1000;

export function createIdempotencyRepository(database: IdempotencyDatabase) {
  return {
    /** The earlier request with this key, if it has not expired. */
    find: async (operation: string, source: string, key: string) => {
      const [row] = await database.select({ fingerprint: idempotencyKeys.requestFingerprint, resultEntityId: idempotencyKeys.resultEntityId }).from(idempotencyKeys)
        .where(and(eq(idempotencyKeys.operation, operation), eq(idempotencyKeys.source, source), eq(idempotencyKeys.key, key), gt(idempotencyKeys.expiresAt, sql`now()`)))
        .limit(1);
      return row ?? null;
    }
  };
}

export type IdempotencyRepository = ReturnType<typeof createIdempotencyRepository>;

/** The statement that records a key. It goes into the same `batch` as the command it protects, so both commit or neither does. */
export function prepareIdempotencyRecord(database: IdempotencyDatabase, entry: IdempotencyEntry) {
  return database.insert(idempotencyKeys).values({
    operation: entry.operation, source: entry.source, key: entry.key, requestFingerprint: entry.fingerprint,
    resultEntityType: entry.resultEntityType, resultEntityId: entry.resultEntityId, expiresAt: entry.expiresAt
  });
}
