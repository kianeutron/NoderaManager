import { RateLimitedError } from "@/shared/errors/application-error";
import type { RateLimitPolicy } from "@/shared/rate-limit/rate-limit-policies";

type Window = { startedAt: number; count: number; windowMilliseconds: number };

/** Above this many tracked keys, expired windows are dropped, so memory stays bounded however many subjects appear. */
const sweepThreshold = 1000;

/**
 * A fixed-window limiter that lives in the memory of one function instance: no database round trip. Counts are per
 * instance, so the effective limit across instances is looser; use it for reads that only need protection from a runaway
 * client. Writes keep the shared database counter (`createRateLimiter`), which is atomic across instances.
 */
export function createMemoryRateLimiter(now: () => number = Date.now) {
  const windows = new Map<string, Window>();

  const sweep = (at: number) => {
    for (const [key, window] of windows) if (at - window.startedAt >= window.windowMilliseconds) windows.delete(key);
  };

  return {
    /** Counts one request for `subject` under `policy`; throws `RateLimitedError` once the window's limit is passed. */
    async enforce(subject: string, policy: RateLimitPolicy): Promise<void> {
      const at = now();
      const windowMilliseconds = policy.windowSeconds * 1000;
      const key = `${policy.name}:${subject}`;
      if (windows.size > sweepThreshold) sweep(at);

      const current = windows.get(key);
      const window = current && at - current.startedAt < windowMilliseconds ? current : { startedAt: at, count: 0, windowMilliseconds };
      window.count += 1;
      windows.set(key, window);

      if (window.count > policy.limit) throw new RateLimitedError(Math.max(1, Math.ceil((window.startedAt + windowMilliseconds - at) / 1000)));
    }
  };
}

export type MemoryRateLimiter = ReturnType<typeof createMemoryRateLimiter>;
