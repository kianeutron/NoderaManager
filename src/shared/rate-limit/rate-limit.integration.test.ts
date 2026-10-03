// @vitest-environment node
import { neon } from "@neondatabase/serverless";
import { inArray, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { v7 as uuidv7 } from "uuid";
import { afterAll, describe, expect, it } from "vitest";
import { rateLimitWindows } from "@/shared/db/schema/rate-limits";
import { createRateLimitRepository } from "@/shared/rate-limit/rate-limit.repository";

// Runs only against an isolated database branch. Never point TEST_DATABASE_URL at production.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const suffix = uuidv7().slice(-12);

describe.skipIf(!testDatabaseUrl)("rate limit counters (real Postgres)", () => {
  const database = drizzle({ client: neon(testDatabaseUrl ?? "postgresql://skipped@localhost/skipped") });
  const repository = createRateLimitRepository(database);
  const key = (label: string) => `test:${label}:${suffix}`;

  afterAll(async () => {
    await database.delete(rateLimitWindows).where(like(rateLimitWindows.key, `%${suffix}`));
  });

  it("counts requests in one window and reports the time left", async () => {
    const counter = key("sequence");
    const hits = [await repository.recordHit(counter, 60), await repository.recordHit(counter, 60), await repository.recordHit(counter, 60)];

    expect(hits.map((hit) => hit.requestCount)).toEqual([1, 2, 3]);
    for (const hit of hits) expect(hit.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    for (const hit of hits) expect(hit.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("keeps keys independent", async () => {
    await repository.recordHit(key("a"), 60);
    await repository.recordHit(key("a"), 60);

    expect((await repository.recordHit(key("b"), 60)).requestCount).toBe(1);
  });

  it("never loses a count under concurrent requests", async () => {
    const counter = key("concurrent");
    const hits = await Promise.all(Array.from({ length: 15 }, () => repository.recordHit(counter, 60)));

    expect(hits.map((hit) => hit.requestCount).sort((left, right) => left - right)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
  });

  it("prunes only this key's expired windows", async () => {
    const mine = key("prune");
    const other = key("prune-other");
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await database.insert(rateLimitWindows).values([{ key: mine, windowStart: twoDaysAgo, requestCount: 5 }, { key: other, windowStart: twoDaysAgo, requestCount: 5 }]);
    await repository.recordHit(mine, 60);

    await repository.pruneExpired(mine);

    const remaining = await database.select().from(rateLimitWindows).where(inArray(rateLimitWindows.key, [mine, other]));
    expect(remaining.filter((row) => row.key === mine)).toHaveLength(1);
    expect(remaining.filter((row) => row.key === other)).toHaveLength(1);
  });

  it("rejects a non-positive count at the database", async () => {
    const error = await database.insert(rateLimitWindows).values({ key: key("bad"), windowStart: new Date(), requestCount: 0 }).then(() => undefined, (failure: unknown) => failure);

    expect(((error as Error).cause as Error | undefined)?.message).toContain("rate_limit_windows_request_count_positive");
  });
});
