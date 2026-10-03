import type { FunnelStepName } from "@/modules/analytics/domain/analytics-values";
import type { FunnelStep } from "@/modules/analytics/domain/analytics.types";
import { shareOf } from "@/shared/ui/charts/percent-change";

const funnelLabel = {
  reached: "Messaged",
  replied: "Replied",
  engaged: "Asked a question or deeper",
  conversation: "Reached a call",
  commercial: "Reached a commercial step"
} as const satisfies Record<FunnelStepName, string>;

export type FunnelRow = Readonly<{ step: FunnelStepName; label: string; prospects: number; ofReached: number; /** Of the step before; null for the first. */ ofPrevious: number | null }>;

/** Each step with its share of everyone messaged and of the step before it, so a drop shows where prospects fall away. */
export function describeFunnel(steps: readonly FunnelStep[]): FunnelRow[] {
  const reached = steps[0]?.prospects ?? 0;
  return steps.map((step, index) => ({
    step: step.step, label: funnelLabel[step.step], prospects: step.prospects,
    ofReached: shareOf(step.prospects, reached),
    ofPrevious: index === 0 ? null : shareOf(step.prospects, steps[index - 1]?.prospects ?? 0)
  }));
}
