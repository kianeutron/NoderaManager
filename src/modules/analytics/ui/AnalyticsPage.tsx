"use client";

import { Stack } from "@mui/material";
import { periodRangeValues } from "@/modules/analytics/domain/analytics.schema";
import { ActivityChart } from "@/modules/analytics/ui/lazy-charts";
import { AnalyticsKpis } from "@/modules/analytics/ui/AnalyticsKpis";
import { analyticsUrlCodec } from "@/modules/analytics/ui/analytics-url-state";
import { ConversionFunnel } from "@/modules/analytics/ui/ConversionFunnel";
import { ContentSkeleton } from "@/shared/ui/ContentSkeleton";
import { DeliverabilityPanel } from "@/modules/analytics/ui/DeliverabilityPanel";
import { PerformanceBreakdown } from "@/modules/analytics/ui/PerformanceBreakdown";
import { ResponseTimePanel } from "@/modules/analytics/ui/ResponseTimePanel";
import { SendTimeHeatmap } from "@/modules/analytics/ui/SendTimeHeatmap";
import { rangeLabel } from "@/modules/analytics/ui/overview-presentation";
import { useInsights } from "@/modules/analytics/ui/use-analytics-queries";
import { describeError } from "@/shared/api/error-copy";
import { DashboardGrid, GridCell } from "@/shared/ui/DashboardGrid";
import { ErrorState } from "@/shared/ui/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { RangeToggle } from "@/shared/ui/RangeToggle";
import { useUrlQueryState } from "@/shared/ui/use-url-query-state";

/** What is working: results over a window you choose, compared with the one before, and split by what you can act on. */
export function AnalyticsPage() {
  const [state, setState] = useUrlQueryState(analyticsUrlCodec);
  const query = useInsights(state.range);
  const insights = query.data;

  return (
    <Stack sx={{ gap: 2.5 }}>
      <PageHeader
        actions={<RangeToggle label="Time window" labels={rangeLabel} onChange={(range) => setState({ ...state, range }, "replace")} options={periodRangeValues} value={state.range} />}
        description="Results over the window you choose, set against the window before it, and split by what you can act on."
        eyebrow="Analytics"
        title="What is working"
      />
      {query.isError && !insights ? <ErrorState description={describeError(query.error, "analytics")} onRetry={() => void query.refetch()} title="Analytics could not be loaded" /> : null}
      {!insights && !query.isError ? <ContentSkeleton label="Loading analytics" /> : null}
      {insights ? (
        <>
          <AnalyticsKpis insights={insights} />
          <ActivityChart description={`Per ${insights.granularity}, ${insights.from} to ${insights.to}`} granularity={insights.granularity} points={insights.trend} />
          <DashboardGrid>
            <GridCell span={7}><ConversionFunnel funnel={insights.funnel} /></GridCell>
            <GridCell span={5}><ResponseTimePanel responseTime={insights.responseTime} /></GridCell>
            <GridCell span={12}><PerformanceBreakdown by={state.by} onByChange={(by) => setState({ ...state, by }, "replace")} range={state.range} /></GridCell>
            <GridCell span={8}><SendTimeHeatmap sendTimes={insights.sendTimes} /></GridCell>
            <GridCell span={4}><DeliverabilityPanel bounceRate={insights.totals.bounceRate} deliverability={insights.deliverability} /></GridCell>
          </DashboardGrid>
        </>
      ) : null}
    </Stack>
  );
}
