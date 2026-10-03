import { RateLimitedError } from "@/shared/errors/application-error";
import { logUnexpectedError } from "@/shared/observability/log-unexpected-error";
import type { RateLimitPolicy } from "@/shared/rate-limit/rate-limit-policies";
import type { RateLimitRepository } from "@/shared/rate-limit/rate-limit.repository";

/**
 * A fixed-window limiter. It fails open: if the counter cannot be reached, the request goes through and the failure is
 * logged, because a database hiccup must not lock the owner out of their own workspace. Authentication remains the guard.
 */
export function createRateLimiter(repository: Pick<RateLimitRepository, "recordHit" | "pruneExpired">) {
  return {
    /** Counts one request for `subject` under `policy`; throws `RateLimitedError` once the window's limit is passed. */
    async enforce(subject: string, policy: RateLimitPolicy): Promise<void> {
      const key = `${policy.name}:${subject}`;
      try {
        const { requestCount, retryAfterSeconds } = await repository.recordHit(key, policy.windowSeconds);
        if (requestCount === 1) await repository.pruneExpired(key);
        if (requestCount > policy.limit) throw new RateLimitedError(retryAfterSeconds);
      } catch (error) {
        if (error instanceof RateLimitedError) throw error;
        logUnexpectedError("rate-limit", error, { policy: policy.name });
      }
    }
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
