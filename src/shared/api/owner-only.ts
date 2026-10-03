import { createMiddleware } from "hono/factory";
import { requireDashboardOwner } from "@/shared/auth/access-boundary";
import type { AuthenticatedActor } from "@/shared/auth/actor";

/**
 * Authorization is explicit on every router (docs/12-security/00-authz-policy.md) and runs before validation, so anonymous
 * callers always see 401. The verified actor is kept for commands, so handlers never resolve the identity twice.
 */
export const ownerOnly = createMiddleware<{ Variables: { actor: AuthenticatedActor } }>(async (context, next) => {
  context.set("actor", await requireDashboardOwner());
  await next();
});
