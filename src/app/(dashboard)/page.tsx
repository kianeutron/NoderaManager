import type { Metadata } from "next";
import { getAnalyticsServices } from "@/modules/analytics/application/analytics-services";
import { analyticsKeys } from "@/modules/analytics/ui/analytics-keys";
import { OverviewPage } from "@/modules/analytics/ui/OverviewPage";
import { overviewUrlCodec } from "@/modules/analytics/ui/overview-url-state";
import { PrefetchedQueries } from "@/shared/api/PrefetchedQueries";
import { requireDashboardPageAccess } from "@/shared/auth/require-dashboard-page-access";
import { toUrlSearchParams } from "@/shared/lib/search-params";

export const metadata: Metadata = { title: "Overview · Nodera" };

export default async function OverviewRoute({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  await requireDashboardPageAccess();
  const range = overviewUrlCodec.parse(toUrlSearchParams(await searchParams));

  return (
    <PrefetchedQueries queries={[{ queryKey: analyticsKeys.overview(range), queryFn: () => getAnalyticsServices().getOverview({ range }) }]}>
      <OverviewPage />
    </PrefetchedQueries>
  );
}
