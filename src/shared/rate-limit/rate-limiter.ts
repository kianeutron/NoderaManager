import "server-only";
import { getDatabase } from "@/shared/db/client";
import { createRateLimiter, type RateLimiter } from "@/shared/rate-limit/create-rate-limiter";
import { createRateLimitRepository } from "@/shared/rate-limit/rate-limit.repository";

export function getRateLimiter(): RateLimiter {
  return createRateLimiter(createRateLimitRepository(getDatabase()));
}
