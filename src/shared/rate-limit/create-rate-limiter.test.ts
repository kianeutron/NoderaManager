// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { RateLimitedError } from "@/shared/errors/application-error";
import { createRateLimiter } from "@/shared/rate-limit/create-rate-limiter";
import type { RateLimitRepository } from "@/shared/rate-limit/rate-limit.repository";

const policy = { name: "test", limit: 2, windowSeconds: 60 } as const;

type Hit = Awaited<ReturnType<RateLimitRepository["recordHit"]>>;

function limiterWith(recordHit: Mock<RateLimitRepository["recordHit"]>, pruneExpired = vi.fn<RateLimitRepository["pruneExpired"]>().mockResolvedValue(undefined)) {
  return { limiter: createRateLimiter({ recordHit, pruneExpired }), recordHit, pruneExpired };
}

const hitMock = (...hits: Hit[]) => hits.reduce((mock, hit) => mock.mockResolvedValueOnce(hit), vi.fn<RateLimitRepository["recordHit"]>()).mockResolvedValue(hits.at(-1) as Hit);

describe("rate limiter", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it("counts under a key made of the policy and the subject", async () => {
    const { limiter, recordHit } = limiterWith(hitMock({ requestCount: 2, retryAfterSeconds: 10 }));
    await limiter.enforce("actor-1", policy);
    expect(recordHit).toHaveBeenCalledWith("test:actor-1", 60);
  });

  it("allows requests up to the limit and refuses the next with the time left", async () => {
    const { limiter } = limiterWith(hitMock({ requestCount: 2, retryAfterSeconds: 25 }, { requestCount: 3, retryAfterSeconds: 25 }));

    await expect(limiter.enforce("a", policy)).resolves.toBeUndefined();
    await expect(limiter.enforce("a", policy)).rejects.toMatchObject({ code: "rate_limited", retryAfterSeconds: 25 });
  });

  it("prunes only when a key opens a new window", async () => {
    const first = limiterWith(hitMock({ requestCount: 1, retryAfterSeconds: 60 }));
    await first.limiter.enforce("a", policy);
    expect(first.pruneExpired).toHaveBeenCalledWith("test:a");

    const later = limiterWith(hitMock({ requestCount: 2, retryAfterSeconds: 30 }));
    await later.limiter.enforce("a", policy);
    expect(later.pruneExpired).not.toHaveBeenCalled();
  });

  it("fails open, and logs without the error message, when the counter is unreachable", async () => {
    const { limiter } = limiterWith(vi.fn<RateLimitRepository["recordHit"]>().mockRejectedValue(new Error("connect ECONNREFUSED postgres://user:pw@host")));

    await expect(limiter.enforce("a", policy)).resolves.toBeUndefined();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/ECONNREFUSED|postgres/);
    expect(vi.mocked(console.error).mock.calls[0]?.[1]).toMatchObject({ scope: "rate-limit", policy: "test" });
  });

  it("does not let a failed cleanup turn into a refusal", async () => {
    const { limiter } = limiterWith(hitMock({ requestCount: 1, retryAfterSeconds: 60 }), vi.fn<RateLimitRepository["pruneExpired"]>().mockRejectedValue(new Error("boom")));
    await expect(limiter.enforce("a", policy)).resolves.toBeUndefined();
  });

  it("refuses with a RateLimitedError instance the API can turn into a 429", async () => {
    const { limiter } = limiterWith(hitMock({ requestCount: 99, retryAfterSeconds: 5 }));
    await expect(limiter.enforce("a", policy)).rejects.toBeInstanceOf(RateLimitedError);
  });
});
