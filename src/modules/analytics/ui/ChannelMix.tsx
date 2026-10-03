"use client";

import { Box, Stack, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { rangeLabel } from "@/modules/analytics/ui/overview-presentation";
import { channelLabel } from "@/modules/outreach/ui/outreach-presentation";
import { formatPercent, shareOf } from "@/shared/ui/charts/percent-change";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";
import { SectionPanel } from "@/shared/ui/SectionPanel";

type ChannelMixProps = Readonly<{ channels: Overview["channels"]; range: Overview["range"] }>;

/** Where messages went, and how often each channel got an answer, with the counts the rate comes from. */
export function ChannelMix({ channels, range }: ChannelMixProps) {
  const colors = useChartColors();
  const total = channels.reduce((sum, channel) => sum + channel.sent, 0);

  return (
    <SectionPanel description={`Sent per channel, last ${rangeLabel[range]}`} title="Channels">
      {total === 0 ? <Typography color="text.secondary">Nothing sent in this window.</Typography> : (
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ alignItems: "center", gap: 2.5 }}>
          <Box aria-hidden sx={{ flex: "0 0 auto", height: 150, width: 150 }}>
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie cornerRadius={6} data={channels.map((channel) => ({ name: channelLabel[channel.channel], value: channel.sent }))} dataKey="value" innerRadius={46} isAnimationActive={false} outerRadius={70} paddingAngle={3} stroke="none">
                  {channels.map((channel, index) => <Cell fill={colors.seriesAt(index)} key={channel.channel} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Stack component="ul" sx={{ flex: 1, gap: 1.25, listStyle: "none", m: 0, p: 0, width: "100%" }}>
            {channels.map((channel, index) => (
              <Stack component="li" direction="row" key={channel.channel} sx={{ alignItems: "center", gap: 1.25, justifyContent: "space-between" }}>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}><Box sx={{ backgroundColor: colors.seriesAt(index), borderRadius: "50%", height: 9, width: 9 }} /><Typography variant="body2">{channelLabel[channel.channel]}</Typography></Stack>
                <Typography color="text.secondary" variant="caption">{channel.sent} sent · {channel.replied} replied ({formatPercent(shareOf(channel.replied, channel.sent))})</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      )}
    </SectionPanel>
  );
}
