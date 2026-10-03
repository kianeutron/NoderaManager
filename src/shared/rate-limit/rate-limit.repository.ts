import { and, eq, lt, sql } from "drizzle-orm";
import type { getDatabase } from "@/shared/db/client";
import { rateLimitWindows } from "@/shared/db/schema/rate-limits";

type RateLimitDatabase = ReturnType<typeof getDatabase>;

export type WindowHit = Readonly<{ requestCount: number; retryAfterSeconds: number }>;

const retentionSeconds = 24 * 60 * 60;

export function createRateLimitRepository(database: RateLimitDatabase) {
  return {
    /**
     * Counts one request in the current window in a single atomic statement, so concurrent requests cannot both read the
     * same count. The window and its remaining time are computed with the database clock, so instances cannot disagree.
     */
    async recordHit(key: string, windowSeconds: number): Promise<WindowHit> {
      const windowStart = sql<Date>`to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}::int) * ${windowSeconds}::int)`;
      const [row] = await database
        .insert(rateLimitWindows)
        .values({ key, windowStart, requestCount: 1 })
        .onConflictDoUpdate({ target: [rateLimitWindows.key, rateLimitWindows.windowStart], set: { requestCount: sql`${rateLimitWindows.requestCount} + 1` } })
        .returning({
          requestCount: rateLimitWindows.requestCount,
          retryAfterSeconds: sql<number>`greatest(1, ceil(extract(epoch from (${rateLimitWindows.windowStart} + make_interval(secs => ${windowSeconds}::int) - now()))))::int`
        });
      if (!row) throw new Error("Rate limit counter was not returned");
      return row;
    },

    /** Drops this key's expired windows. Called when a key opens a new window, so a key never accumulates rows. */
    async pruneExpired(key: string): Promise<void> {
      await database.delete(rateLimitWindows).where(and(eq(rateLimitWindows.key, key), lt(rateLimitWindows.windowStart, sql`now() - make_interval(secs => ${retentionSeconds}::int)`)));
    }
  };
}

export type RateLimitRepository = ReturnType<typeof createRateLimitRepository>;
