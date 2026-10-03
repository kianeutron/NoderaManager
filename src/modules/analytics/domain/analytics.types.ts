import type { FollowUpSummary, FollowUpView } from "@/modules/followups/domain/followup.types";
import type { CampaignSummary } from "@/modules/campaigns/domain/campaign.types";
import type { RouteOverview } from "@/modules/routes/domain/route.types";
import type { OverviewRange, PeriodRange, PerformanceDimension } from "@/modules/analytics/domain/analytics.schema";
import type { FunnelStepName, ResponseTimeBucket } from "@/modules/analytics/domain/analytics-values";
import type { Granularity } from "@/modules/analytics/domain/period-window";
import type { outreachChannelValues, prospectStatusValues } from "@/shared/db/schema/crm-values";

type ProspectStatus = (typeof prospectStatusValues)[number];
type Channel = (typeof outreachChannelValues)[number];

/** One UTC day or week (named by its first day): messages sent in it and replies received in it. */
export type ActivityPoint = Readonly<{ date: string; sent: number; replies: number }>;

/** A figure for the window and for the equally long window before it. */
export type Comparison = Readonly<{ current: number; previous: number }>;

/** A percentage always travels with what it is a percentage of (docs/11-operations/02-analytics-definitions.md). */
export type Ratio = Readonly<{ part: number; whole: number }>;

export type OverviewTotals = Readonly<{
  /** Messages sent. */
  sent: Comparison;
  /** Distinct prospects messaged. */
  reached: Comparison;
  /** Real replies received (auto-replies are not counted). */
  replies: Comparison;
  /** Prospects messaged in the window that replied, of those messaged. */
  replyRate: Readonly<{ current: Ratio; previous: Ratio }>;
}>;

export type PipelineStage = Readonly<{ status: ProspectStatus; prospects: number }>;
export type ChannelActivity = Readonly<{ channel: Channel; sent: number; replied: number }>;
/** How many prospects' deepest classified reply reached this step (1 acknowledgement to 9 paid work). */
export type DepthStep = Readonly<{ depth: number; prospects: number }>;

/** A message with no reply yet, to a prospect still open, old enough to be worth a nudge. */
export type AwaitingReply = Readonly<{
  messageId: string;
  prospectId: string;
  channel: Channel;
  sentAt: string;
  personName: string | null;
  organizationName: string | null;
}>;

export type Overview = Readonly<{
  range: OverviewRange;
  days: number;
  /** First and last UTC day of the window, `YYYY-MM-DD`. */
  from: string;
  to: string;
  totals: OverviewTotals;
  /** The window, one point per day, zeros included. */
  activity: readonly ActivityPoint[];
  /** The last 26 weeks regardless of the window, for the calendar. */
  calendar: readonly ActivityPoint[];
  pipeline: readonly PipelineStage[];
  channels: readonly ChannelActivity[];
  depth: readonly DepthStep[];
  awaitingReply: Readonly<{ total: number; items: readonly AwaitingReply[] }>;
  followUps: Readonly<{ summary: FollowUpSummary; overdue: readonly FollowUpView[] }>;
  routes: readonly RouteOverview[];
  campaigns: readonly CampaignSummary[];
}>;

/** A rate with the counts behind it, for the window and the one before. */
export type Rate = Readonly<{ current: Ratio; previous: Ratio }>;

/** Prospects messaged in the window, narrowed step by step: each step is a subset of the one before. */
export type FunnelStep = Readonly<{ step: FunnelStepName; prospects: number }>;

/** How long the first reply took, for messages sent in the window that were answered. */
export type ResponseTime = Readonly<{
  sample: number;
  medianHours: number | null;
  buckets: readonly Readonly<{ bucket: ResponseTimeBucket; replies: number }>[];
}>;

/** One cell of the week: ISO weekday 1 (Monday) to 7, UTC hour 0 to 23. Cells with nothing sent are absent. */
export type SendTimeCell = Readonly<{ weekday: number; hour: number; sent: number; replied: number }>;

/** `delivered` is provider-confirmed; without confirmation a message stays unconfirmed (docs/11-operations/00-status-taxonomy.md). */
export type Deliverability = Readonly<{
  sent: number;
  delivered: number;
  failed: number;
  unconfirmed: number;
  bounces: Readonly<{ soft: number; hard: number; blocked: number }>;
}>;

export type Insights = Readonly<{
  range: PeriodRange;
  days: number;
  granularity: Granularity;
  from: string;
  to: string;
  totals: Readonly<{ sent: Comparison; reached: Comparison; replyRate: Rate; bounceRate: Rate }>;
  trend: readonly ActivityPoint[];
  funnel: Readonly<{ steps: readonly FunnelStep[]; won: number }>;
  responseTime: ResponseTime;
  sendTimes: readonly SendTimeCell[];
  deliverability: Deliverability;
}>;

/** One group of messages sharing a value of the chosen dimension (a route, a persona, a country...). `key: null` means the dimension is not recorded. */
export type PerformanceRow = Readonly<{
  key: string | null;
  /** Resolved for dimensions that are records (routes, modules, campaigns); null for values the screen words itself. */
  name: string | null;
  sent: number;
  reached: number;
  repliedProspects: number;
  repliedMessages: number;
  bounced: number;
}>;

export type PerformanceBreakdown = Readonly<{
  range: PeriodRange;
  days: number;
  from: string;
  to: string;
  dimension: PerformanceDimension;
  rows: readonly PerformanceRow[];
  /** How many groups there are in all; more than `rows.length` when the list was cut. */
  groups: number;
}>;
