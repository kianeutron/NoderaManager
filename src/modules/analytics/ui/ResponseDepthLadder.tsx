import { Typography } from "@mui/material";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { describeResponseDepth } from "@/modules/interactions/ui/interaction-presentation";
import { BarRows } from "@/shared/ui/charts/BarRows";
import { SectionPanel } from "@/shared/ui/SectionPanel";

/** How far conversations got: each prospect counted once, at the deepest step of any reply you classified. */
export function ResponseDepthLadder({ depth }: Readonly<{ depth: Overview["depth"] }>) {
  const empty = depth.every((step) => step.prospects === 0);

  return (
    <SectionPanel description="Deepest classified reply per prospect, all time" title="How deep replies go">
      {empty
        ? <Typography color="text.secondary">No replies classified yet. Choose a response depth when you log a reply and the ladder fills in.</Typography>
        : <BarRows label="Prospects by deepest reply" rows={depth.map((step) => ({ key: String(step.depth), label: describeResponseDepth(step.depth), value: step.prospects }))} />}
    </SectionPanel>
  );
}
