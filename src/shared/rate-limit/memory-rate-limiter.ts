import { createMemoryRateLimiter, type MemoryRateLimiter } from "@/shared/rate-limit/create-memory-rate-limiter";

// One per function instance, kept for as long as the instance lives, which is what makes the counts mean anything.
const limiter = createMemoryRateLimiter();

export function getMemoryRateLimiter(): MemoryRateLimiter {
  return limiter;
}
