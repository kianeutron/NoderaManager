// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "@/shared/rate-limit/create-memory-rate-limiter";

const policy = { name: "test", limit: 2, windowSeconds: 60 } as const;

describe("memory rate limiter", () => {
  it("allows requests up to the limit, then refuses with the time left in the window", async () => {
    let time = 1_000_000;
    const limiter = createMemoryRateLimiter(() => time);

    await limiter.enforce("a", policy);
    await limiter.enforce("a", policy);
    time += 20_000;
    await expect(limiter.enforce("a", policy)).rejects.toMatchObject({ code: "rate_limited", retryAfterSeconds: 40 });
  });

  it("starts a fresh window once the old one has passed", async () => {
    let time = 0;
    const limiter = createMemoryRateLimiter(() => time);
    await limiter.enforce("a", policy);
    await limiter.enforce("a", policy);

    time += 60_000;
    await expect(limiter.enforce("a", policy)).resolves.toBeUndefined();
  });

  it("counts each subject and each policy on its own", async () => {
    const limiter = createMemoryRateLimiter(() => 0);
    await limiter.enforce("a", policy);
    await limiter.enforce("a", policy);

    await expect(limiter.enforce("b", policy)).resolves.toBeUndefined();
    await expect(limiter.enforce("a", { ...policy, name: "other" })).resolves.toBeUndefined();
  });

  it("forgets expired windows so memory stays bounded", async () => {
    let time = 0;
    const limiter = createMemoryRateLimiter(() => time);
    for (let subject = 0; subject < 1100; subject += 1) await limiter.enforce(`s${subject}`, policy);

    time += 120_000;
    // After the sweep a subject that was at its limit starts over.
    await limiter.enforce("s0", policy);
    await limiter.enforce("s0", policy);
    await expect(limiter.enforce("s0", policy)).rejects.toMatchObject({ code: "rate_limited" });
  });
});
