"use client";

import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useId } from "react";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { layoutPipeline } from "@/modules/analytics/ui/pipeline-layout";
import { prospectStatusMeta } from "@/modules/prospects/ui/prospect-presentation";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";
import { SectionPanel } from "@/shared/ui/SectionPanel";

const size = { width: 800, height: 150 } as const;

/** Prospects by stage as a river: the thicker the bar, the more prospects are there right now. Ways out sit underneath. */
export function PipelineFlow({ pipeline }: Readonly<{ pipeline: Overview["pipeline"] }>) {
  const gradient = useId().replaceAll(":", "");
  const colors = useChartColors();
  const { bars, ribbons, exits, total } = layoutPipeline(pipeline, size);
  const open = bars.reduce((sum, bar) => (bar.status === "won" ? sum : sum + bar.prospects), 0);

  return (
    <SectionPanel description={`${total.toLocaleString("en")} prospects in all, ${open.toLocaleString("en")} still open`} title="Pipeline">
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 560 }}>
          <svg aria-hidden height={150} preserveAspectRatio="none" viewBox={`0 0 ${size.width} ${size.height}`} width="100%">
            <defs>
              <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor={colors.primary} /><stop offset="55%" stopColor={colors.secondary} /><stop offset="100%" stopColor={colors.success} /></linearGradient>
            </defs>
            {ribbons.map((ribbon) => <path d={ribbon.path} fill={`url(#${gradient})`} key={ribbon.from} opacity={0.28} />)}
            {bars.map((bar) => <rect fill={`url(#${gradient})`} height={bar.height} key={bar.status} opacity={bar.prospects === 0 ? 0.35 : 1} rx={4} width={bar.width} x={bar.x} y={bar.y} />)}
          </svg>
          <Box component="ol" sx={{ display: "grid", gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`, listStyle: "none", m: 0, mt: 1, p: 0 }}>
            {bars.map((bar) => (
              <Box component="li" key={bar.status} sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1.1 }}>{bar.prospects.toLocaleString("en")}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 11 }}>{prospectStatusMeta[bar.status].label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 2, mt: 2 }}>
        <Typography color="text.secondary" variant="caption">Ways out</Typography>
        {exits.map((exit) => (
          <Stack direction="row" key={exit.status} sx={(theme) => ({ alignItems: "center", backgroundColor: alpha(theme.palette.text.secondary, 0.1), borderRadius: 99, gap: 0.75, px: 1.25, py: 0.4 })}>
            <Typography sx={{ fontSize: 12 }}>{prospectStatusMeta[exit.status].label}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{exit.prospects.toLocaleString("en")}</Typography>
          </Stack>
        ))}
      </Stack>
    </SectionPanel>
  );
}
