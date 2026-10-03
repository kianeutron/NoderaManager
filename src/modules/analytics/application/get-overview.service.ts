import type { ActivityRepository } from "@/modules/analytics/data/activity.repository";
import type { OverviewRepository } from "@/modules/analytics/data/overview.repository";
import type { PerformanceRepository } from "@/modules/analytics/data/performance.repository";
import type { OverviewQuery } from "@/modules/analytics/domain/analytics.schema";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { awaitingReplyAfterDays, awaitingReplyWithinDays, overviewWindow } from "@/modules/analytics/domain/overview-window";
import { fillBuckets, mergeBuckets, sumOf, utcDay } from "@/modules/analytics/domain/period-window";
import { toReplyRate } from "@/modules/analytics/application/insights-builders";
import { toAwaitingReply, toChannels, toDepthSteps, toPipeline } from "@/modules/analytics/application/overview-builders";
import type { CampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import type { FollowUpsServices } from "@/modules/followups/application/create-followups-services";
import type { RoutesServices } from "@/modules/routes/application/create-routes-services";

const dayMs = 86_400_000;
const listedCampaigns = 6;
const listedFollowUps = 5;
const channelGroups = 10;

export type OverviewDependencies = Readonly<{
  activity: ActivityRepository;
  overview: OverviewRepository;
  performance: Pick<PerformanceRepository, "breakdown">;
  followUps: Pick<FollowUpsServices, "getFollowUpSummary" | "searchFollowUps">;
  routes: Pick<RoutesServices, "getRouteOverview">;
  campaigns: Pick<CampaignsServices, "searchCampaigns">;
}>;

/**
 * Everything the overview page shows, in one call. Follow-ups, routes and campaigns come from their own services so the
 * numbers on this page can never disagree with the pages they link to.
 */
export async function getOverview({ activity, overview, performance, followUps, routes, campaigns }: OverviewDependencies, { range }: OverviewQuery, now = new Date()): Promise<Overview> {
  const window = overviewWindow(range, now);

  const [sentRows, replyRows, totals, pipeline, channels, depth, awaitingReply, followUpSummary, overdue, routeOverview, activeCampaigns] = await Promise.all([
    activity.sentByBucket(window.calendarFrom, "day"),
    activity.repliesByBucket(window.calendarFrom, "day"),
    activity.periodTotals(window),
    overview.prospectsByStatus(),
    performance.breakdown({ dimension: "channel", from: window.from, limit: channelGroups }),
    overview.depthReached(),
    overview.awaitingReply({ since: new Date(now.getTime() - awaitingReplyWithinDays * dayMs), before: new Date(now.getTime() - awaitingReplyAfterDays * dayMs) }),
    followUps.getFollowUpSummary(),
    followUps.searchFollowUps({ status: "active", due: "overdue", sort: "due", limit: listedFollowUps }),
    routes.getRouteOverview({ scope: "active" }),
    campaigns.searchCampaigns({ status: "active", scope: "active", sort: "updated", limit: listedCampaigns })
  ]);

  const calendar = fillBuckets(mergeBuckets(sentRows, replyRows), window.calendarFrom, now, "day");
  const windowActivity = calendar.slice(-window.days);
  const previous = calendar.slice(-2 * window.days, -window.days);

  return {
    range,
    days: window.days,
    from: utcDay(window.from),
    to: utcDay(now),
    totals: {
      sent: { current: totals.current.sent, previous: totals.previous.sent },
      reached: { current: totals.current.reached, previous: totals.previous.reached },
      replies: { current: sumOf(windowActivity, "replies"), previous: sumOf(previous, "replies") },
      replyRate: toReplyRate(totals)
    },
    activity: windowActivity,
    calendar,
    pipeline: toPipeline(pipeline),
    channels: toChannels(channels),
    depth: toDepthSteps(depth),
    awaitingReply: { total: awaitingReply.total, items: awaitingReply.items.map(toAwaitingReply) },
    followUps: { summary: followUpSummary, overdue: overdue.items },
    routes: routeOverview,
    campaigns: activeCampaigns.items
  };
}
