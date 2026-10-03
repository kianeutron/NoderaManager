import { Hono } from "hono";
import { getAnalyticsServices } from "@/modules/analytics/application/analytics-services";
import { breakdownQuerySchema, insightsQuerySchema, overviewQuerySchema } from "@/modules/analytics/domain/analytics.schema";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { analyticsReadPolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

/** Read-only, but each request aggregates over a whole window, so reads are rate limited too. */
export const analyticsRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(analyticsReadPolicy, () => true))
  .get("/overview", zodValidator("query", overviewQuerySchema), async (context) => context.json(await getAnalyticsServices().getOverview(context.req.valid("query")), 200, noStore))
  .get("/insights", zodValidator("query", insightsQuerySchema), async (context) => context.json(await getAnalyticsServices().getInsights(context.req.valid("query")), 200, noStore))
  .get("/breakdown", zodValidator("query", breakdownQuerySchema), async (context) => context.json(await getAnalyticsServices().getBreakdown(context.req.valid("query")), 200, noStore));

export type AnalyticsRoutes = typeof analyticsRoutes;
