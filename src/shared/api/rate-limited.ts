import { createMiddleware } from "hono/factory";
import { isStateChanging } from "@/shared/api/http-methods";
import type { AuthenticatedActor } from "@/shared/auth/actor";
import type { RateLimitPolicy } from "@/shared/rate-limit/rate-limit-policies";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";

/**
 * Counts requests per verified actor, so it runs after `ownerOnly` (anonymous callers never reach the counter).
 * By default only state-changing requests count; reads are cheap and paginated.
 */
export function rateLimited(policy: RateLimitPolicy, appliesTo: (method: string) => boolean = isStateChanging) {
  return createMiddleware<{ Variables: { actor: AuthenticatedActor } }>(async (context, next) => {
    if (appliesTo(context.req.method)) await getRateLimiter().enforce(context.var.actor.id, policy);
    await next();
  });
}
