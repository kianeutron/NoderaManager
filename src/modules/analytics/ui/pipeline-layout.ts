import type { PipelineStage } from "@/modules/analytics/domain/analytics.types";

/** The path a prospect takes, in order. The rest (dormant, lost, disqualified) are ways out of it, not steps along it. */
const pipelineSteps = ["researched", "ready", "contacted", "replied", "warm", "opportunity", "proposal", "won"] as const satisfies readonly PipelineStage["status"][];
const pipelineExits = ["dormant", "lost", "disqualified"] as const satisfies readonly PipelineStage["status"][];

export type PipelineBar = Readonly<{ status: (typeof pipelineSteps)[number]; prospects: number; x: number; y: number; width: number; height: number }>;
export type PipelineRibbon = Readonly<{ from: (typeof pipelineSteps)[number]; to: (typeof pipelineSteps)[number]; path: string }>;
export type PipelineLayout = Readonly<{ bars: readonly PipelineBar[]; ribbons: readonly PipelineRibbon[]; exits: readonly PipelineStage[]; total: number }>;

type Size = Readonly<{ width: number; height: number }>;

const barWidth = 14;
const minimumHeight = 6;

/** Bars sized to their counts, centred on one line, with a ribbon between neighbours as thick as the thinner of the two. */
export function layoutPipeline(stages: readonly PipelineStage[], { width, height }: Size): PipelineLayout {
  const counts = new Map(stages.map((stage) => [stage.status, stage.prospects]));
  const peak = Math.max(1, ...pipelineSteps.map((status) => counts.get(status) ?? 0));
  const span = (width - barWidth) / (pipelineSteps.length - 1);

  const bars: PipelineBar[] = pipelineSteps.map((status, index) => {
    const prospects = counts.get(status) ?? 0;
    const barHeight = prospects === 0 ? minimumHeight : Math.max(minimumHeight, (prospects / peak) * height);
    return { status, prospects, x: index * span, y: (height - barHeight) / 2, width: barWidth, height: barHeight };
  });

  const ribbons: PipelineRibbon[] = bars.slice(0, -1).flatMap((bar, index) => {
    const next = bars[index + 1];
    if (!next) return [];
    const thickness = Math.min(bar.height, next.height);
    const startX = bar.x + bar.width;
    const middle = (startX + next.x) / 2;
    const topFrom = height / 2 - thickness / 2;
    const bottomFrom = height / 2 + thickness / 2;
    return [{ from: bar.status, to: next.status, path: `M${startX},${topFrom} C${middle},${topFrom} ${middle},${topFrom} ${next.x},${topFrom} L${next.x},${bottomFrom} C${middle},${bottomFrom} ${middle},${bottomFrom} ${startX},${bottomFrom} Z` }];
  });

  return {
    bars, ribbons,
    exits: pipelineExits.map((status) => ({ status, prospects: counts.get(status) ?? 0 })),
    total: stages.reduce((sum, stage) => sum + stage.prospects, 0)
  };
}
