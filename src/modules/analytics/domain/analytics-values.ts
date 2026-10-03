import { responseDepthLabels } from "@/shared/db/schema/crm-values";

export const funnelSteps = ["reached", "replied", "engaged", "conversation", "commercial"] as const;
export type FunnelStepName = (typeof funnelSteps)[number];

export const responseTimeBuckets = ["hour", "day", "three_days", "week", "later"] as const;
export type ResponseTimeBucket = (typeof responseTimeBuckets)[number];

const depthOf = (label: (typeof responseDepthLabels)[number]) => responseDepthLabels.indexOf(label) + 1;

/**
 * The deepest classified reply a prospect needs to count at each funnel step. A reply's depth is only known if you
 * classified it, so these steps undercount until you do.
 */
export const funnelDepth = {
  engaged: depthOf("qualification_question"),
  conversation: depthOf("call_or_interview"),
  commercial: depthOf("proposal_or_commercial_step")
} as const;

/** Upper bound of each response-time bucket, in hours; the last bucket has none. */
export const responseTimeLimitHours = { hour: 1, day: 24, three_days: 72, week: 168 } as const;
