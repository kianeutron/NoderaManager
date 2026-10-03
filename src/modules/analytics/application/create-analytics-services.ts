import { createActivityRepository } from "@/modules/analytics/data/activity.repository";
import { createOverviewRepository } from "@/modules/analytics/data/overview.repository";
import { createPerformanceRepository } from "@/modules/analytics/data/performance.repository";
import { getBreakdown } from "@/modules/analytics/application/get-breakdown.service";
import { getInsights } from "@/modules/analytics/application/get-insights.service";
import { getOverview } from "@/modules/analytics/application/get-overview.service";
import type { BreakdownQuery, InsightsQuery, OverviewQuery } from "@/modules/analytics/domain/analytics.schema";
import { createCampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import { createFollowUpsServices } from "@/modules/followups/application/create-followups-services";
import { createRoutesServices } from "@/modules/routes/application/create-routes-services";
import type { getDatabase } from "@/shared/db/client";

/** Free of environment access so tests can run it against a test database. Everything here only reads. */
export function createAnalyticsServices({ database }: Readonly<{ database: ReturnType<typeof getDatabase> }>) {
  const activity = createActivityRepository(database);
  const performance = createPerformanceRepository(database);
  const overview = { activity, overview: createOverviewRepository(database), performance, followUps: createFollowUpsServices({ database }), routes: createRoutesServices({ database }), campaigns: createCampaignsServices({ database }) };

  return {
    getOverview: (query: OverviewQuery, now?: Date) => getOverview(overview, query, now),
    getInsights: (query: InsightsQuery, now?: Date) => getInsights({ activity, performance }, query, now),
    getBreakdown: (query: BreakdownQuery, now?: Date) => getBreakdown(performance, query, now)
  };
}

export type AnalyticsServices = ReturnType<typeof createAnalyticsServices>;
