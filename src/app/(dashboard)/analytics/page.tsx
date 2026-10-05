import type { Metadata } from "next";
import { getAnalyticsServices } from "@/modules/analytics/application/analytics-services";
import { defaultBreakdownRows } from "@/modules/analytics/domain/analytics.schema";
import { analyticsKeys } from "@/modules/analytics/ui/analytics-keys";
import { AnalyticsPage } from "@/modules/analytics/ui/AnalyticsPage";
import { analyticsUrlCodec } from "@/modules/analytics/ui/analytics-url-state";
import { PrefetchedQueries } from "@/shared/api/PrefetchedQueries";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";
import { toUrlSearchParams } from "@/shared/lib/search-params";

export const metadata: Metadata = { title: "Analytics · Nodera" };

export default async function AnalyticsRoute({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  await requireDashboardPageAccess();
  const { range, by } = analyticsUrlCodec.parse(toUrlSearchParams(await searchParams));
  const analytics = getAnalyticsServices();

  return (
    <PrefetchedQueries
      queries={[
        { queryKey: analyticsKeys.insights(range), queryFn: () => analytics.getInsights({ range }) },
        { queryKey: analyticsKeys.breakdown(range, by), queryFn: () => analytics.getBreakdown({ range, by, limit: defaultBreakdownRows }) }
      ]}
    >
      <AnalyticsPage />
    </PrefetchedQueries>
  );
}
