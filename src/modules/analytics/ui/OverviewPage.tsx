"use client";

import { Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityCalendar } from "@/modules/analytics/ui/ActivityCalendar";
import { ActivityChart } from "@/modules/analytics/ui/ActivityChart";
import { AttentionQueue } from "@/modules/analytics/ui/AttentionQueue";
import { CampaignPulse } from "@/modules/analytics/ui/CampaignPulse";
import { ChannelMix } from "@/modules/analytics/ui/ChannelMix";
import { DashboardSkeleton } from "@/modules/analytics/ui/DashboardSkeleton";
import { KpiStrip } from "@/modules/analytics/ui/KpiStrip";
import { OverviewHero } from "@/modules/analytics/ui/OverviewHero";
import { overviewUrlCodec } from "@/modules/analytics/ui/overview-url-state";
import { PipelineFlow } from "@/modules/analytics/ui/PipelineFlow";
import { ResponseDepthLadder } from "@/modules/analytics/ui/ResponseDepthLadder";
import { RouteLeaderboard } from "@/modules/analytics/ui/RouteLeaderboard";
import { rangeLabel } from "@/modules/analytics/ui/overview-presentation";
import { analyticsKeys, useOverview } from "@/modules/analytics/ui/use-analytics-queries";
import { describeError } from "@/shared/api/error-copy";
import { AppShell } from "@/shared/ui/AppShell";
import { DashboardGrid, GridCell } from "@/shared/ui/DashboardGrid";
import { ErrorState } from "@/shared/ui/ErrorState";
import { useUrlQueryState } from "@/shared/ui/use-url-query-state";

/** The home page: today's priorities first, then the numbers behind them, all over one window chosen in the hero. */
export function OverviewPage() {
  const [range, setRange] = useUrlQueryState(overviewUrlCodec);
  const query = useOverview(range);
  const queryClient = useQueryClient();
  // One clock per visit, so "3 days ago" and "overdue" do not flicker while the page is open.
  const [now] = useState(() => new Date());
  const overview = query.data;

  return (
    <AppShell>
      <Stack sx={{ gap: 2.5 }}>
        <OverviewHero now={now} onLogged={() => void queryClient.invalidateQueries({ queryKey: analyticsKeys.all })} onRangeChange={(next) => setRange(next, "replace")} overview={overview} range={range} />
        {query.isError && !overview ? <ErrorState description={describeError(query.error, "overview")} onRetry={() => void query.refetch()} title="The overview could not be loaded" /> : null}
        {!overview && !query.isError ? <DashboardSkeleton label="Loading overview" /> : null}
        {overview ? (
          <>
            <KpiStrip overview={overview} />
            <DashboardGrid>
              <GridCell span={8}><ActivityChart description={`Per day, last ${rangeLabel[overview.range]}`} granularity="day" points={overview.activity} /></GridCell>
              <GridCell rows={2} span={4}><AttentionQueue awaitingReply={overview.awaitingReply} followUps={overview.followUps} now={now} /></GridCell>
              <GridCell span={8}><PipelineFlow pipeline={overview.pipeline} /></GridCell>
              <GridCell span={7}><ActivityCalendar calendar={overview.calendar} /></GridCell>
              <GridCell span={5}><ResponseDepthLadder depth={overview.depth} /></GridCell>
              <GridCell span={7}><RouteLeaderboard routes={overview.routes} /></GridCell>
              <GridCell span={5}><ChannelMix channels={overview.channels} range={overview.range} /></GridCell>
              <GridCell span={12}><CampaignPulse campaigns={overview.campaigns} /></GridCell>
            </DashboardGrid>
          </>
        ) : null}
      </Stack>
    </AppShell>
  );
}
