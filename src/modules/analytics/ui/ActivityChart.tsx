"use client";

import { Box, Stack, Typography } from "@mui/material";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActivityPoint } from "@/modules/analytics/domain/analytics.types";
import { sumOf, type Granularity } from "@/modules/analytics/domain/period-window";
import { formatDay } from "@/modules/analytics/ui/overview-presentation";
import { ChartTooltip } from "@/shared/ui/charts/ChartTooltip";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";
import { SectionPanel } from "@/shared/ui/SectionPanel";

type ActivityChartProps = Readonly<{ points: readonly ActivityPoint[]; granularity: Granularity; description: string }>;

/** Messages sent per day (or week), with the replies that came back drawn over them. */
export function ActivityChart({ points, granularity, description }: ActivityChartProps) {
  const colors = useChartColors();
  const unit = granularity === "week" ? "week" : "day";
  const formatLabel = (date: string) => (granularity === "week" ? `Week of ${formatDay(date)}` : formatDay(date));
  const label = `Messages sent and replies received per ${unit}: ${sumOf(points, "sent")} sent, ${sumOf(points, "replies")} replies.`;

  return (
    <SectionPanel
      action={(
        <Stack direction="row" sx={{ gap: 2 }}>
          <Legend color={colors.primary} label="Sent" />
          <Legend color={colors.success} label="Replies" />
        </Stack>
      )}
      description={description}
      title="Activity"
    >
      <Box aria-label={label} role="img" sx={{ height: { xs: 220, md: 280 }, mx: -1 }}>
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart data={[...points]} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={colors.primary} stopOpacity={0.5} /><stop offset="100%" stopColor={colors.primary} stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 5" vertical={false} />
            <XAxis axisLine={false} dataKey="date" minTickGap={28} tick={{ fill: colors.text, fontSize: 11 }} tickFormatter={formatDay} tickLine={false} />
            <YAxis allowDecimals={false} axisLine={false} tick={{ fill: colors.text, fontSize: 11 }} tickLine={false} width={32} />
            <Tooltip content={<ChartTooltip formatLabel={formatLabel} />} cursor={{ stroke: colors.primaryLight, strokeDasharray: "3 4" }} />
            <Area activeDot={{ r: 4 }} dataKey="sent" fill="url(#activityFill)" isAnimationActive={false} name="Sent" stroke={colors.primary} strokeWidth={2} type="monotone" />
            <Line activeDot={{ r: 4 }} dataKey="replies" dot={false} isAnimationActive={false} name="Replies" stroke={colors.success} strokeWidth={2} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </SectionPanel>
  );
}

function Legend({ color, label }: Readonly<{ color: string; label: string }>) {
  return <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Box sx={{ backgroundColor: color, borderRadius: "50%", height: 8, width: 8 }} /><Typography color="text.secondary" variant="caption">{label}</Typography></Stack>;
}
