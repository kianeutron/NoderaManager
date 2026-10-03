import { createMiddleware } from "hono/factory";
import { isStateChanging } from "@/shared/api/http-methods";

/**
 * CSRF defence for cookie-authenticated writes (docs/07-quality/08-security-baseline.md): state-changing requests must come
 * from this site's own pages. Browsers always send `Origin` on such requests and page scripts cannot forge it, so a
 * missing or foreign origin is refused. This complements the SameSite session cookie; it does not replace it.
 */
export const sameOriginOnly = createMiddleware(async (context, next) => {
  if (isStateChanging(context.req.method) && context.req.header("origin") !== new URL(context.req.url).origin) {
    return context.json({ code: "FORBIDDEN", reason: "cross_origin", requestId: context.get("requestId") as string | undefined }, 403, { "Cache-Control": "no-store" });
  }
  await next();
});
