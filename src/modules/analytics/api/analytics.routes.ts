import { Hono } from "hono";
import { etag } from "hono/etag";
import { getAnalyticsServices } from "@/modules/analytics/application/analytics-services";
import { breakdownQuerySchema, insightsQuerySchema, overviewQuerySchema } from "@/modules/analytics/domain/analytics.schema";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { analyticsReadPolicy } from "@/shared/rate-limit/rate-limit-policies";
import { getMemoryRateLimiter } from "@/shared/rate-limit/memory-rate-limiter";

// Private to the owner and always revalidated: an unchanged result comes back as a 304 with no body.
const revalidate = { "Cache-Control": "private, no-cache" } as const;

/** Read-only, but each request aggregates over a whole window, so reads are rate limited too (in memory: no database round trip). */
export const analyticsRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(analyticsReadPolicy, () => true, getMemoryRateLimiter))
  .use(etag())
  .get("/overview", zodValidator("query", overviewQuerySchema), async (context) => context.json(await getAnalyticsServices().getOverview(context.req.valid("query")), 200, revalidate))
  .get("/insights", zodValidator("query", insightsQuerySchema), async (context) => context.json(await getAnalyticsServices().getInsights(context.req.valid("query")), 200, revalidate))
  .get("/breakdown", zodValidator("query", breakdownQuerySchema), async (context) => context.json(await getAnalyticsServices().getBreakdown(context.req.valid("query")), 200, revalidate));

export type AnalyticsRoutes = typeof analyticsRoutes;
