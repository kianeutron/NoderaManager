import { createMiddleware } from "hono/factory";
import { isStateChanging } from "@/shared/api/http-methods";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { RateLimitPolicy } from "@/shared/rate-limit/rate-limit-policies";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";

type Limiter = Readonly<{ enforce: (subject: string, policy: RateLimitPolicy) => Promise<void> }>;

/**
 * Counts requests per verified actor, so it runs after `ownerOnly` (anonymous callers never reach the counter).
 * By default only state-changing requests count; reads are cheap and paginated. `limiter` chooses where the count lives: the
 * shared database counter (the default, atomic across instances, one round trip per request) or `getMemoryRateLimiter`
 * (per instance, no round trip, for reads that only need protection from a runaway client).
 */
export function rateLimited(policy: RateLimitPolicy, appliesTo: (method: string) => boolean = isStateChanging, limiter: () => Limiter = getRateLimiter) {
  return createMiddleware<{ Variables: { actor: AuthenticatedActor } }>(async (context, next) => {
    if (appliesTo(context.req.method)) await limiter().enforce(context.var.actor.id, policy);
    await next();
  });
}
