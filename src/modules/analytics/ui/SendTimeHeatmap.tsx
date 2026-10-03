"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useState } from "react";
import type { Insights } from "@/modules/analytics/domain/analytics.types";
import { layoutSendTimes, minimumCellSample, sendTimeMetrics, type SendTimeMetric, type SendTimeSlot } from "@/modules/analytics/ui/send-time-layout";
import { formatPercent, shareOf } from "@/shared/ui/charts/percent-change";
import { HeatCell } from "@/shared/ui/charts/HeatCell";
import { RangeToggle } from "@/shared/ui/RangeToggle";
import { SectionPanel } from "@/shared/ui/SectionPanel";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const metricLabel = { volume: "Messages sent", replyRate: "Reply rate" } as const satisfies Record<SendTimeMetric, string>;
const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const cell = 18;

const describeSlot = ({ weekday, hour, sent, replied, rated }: SendTimeSlot) =>
  `${weekdays[weekday - 1]} ${hourLabel(hour)} UTC: ${sent} sent, ${replied} replied${sent > 0 ? ` (${formatPercent(shareOf(replied, sent))})` : ""}${sent > 0 && !rated ? ", too few to rate" : ""}`;

/** When messages went out and when they got answered. Times are UTC, matching every other figure. */
export function SendTimeHeatmap({ sendTimes }: Readonly<{ sendTimes: Insights["sendTimes"] }>) {
  const [metric, setMetric] = useState<SendTimeMetric>("volume");
  const { rows, best, total } = layoutSendTimes(sendTimes, metric);

  return (
    <SectionPanel action={<RangeToggle label="Shade by" labels={metricLabel} onChange={setMetric} options={sendTimeMetrics} value={metric} />} description="Weekday and hour (UTC) messages were sent" title="Best time to send">
      {total === 0 ? <Typography color="text.secondary">Nothing was sent in this window.</Typography> : (
        <>
          <Box sx={{ overflowX: "auto", pb: 1 }}>
            <Box sx={{ display: "grid", gap: "3px", gridTemplateColumns: `32px repeat(24, minmax(${cell}px, 1fr))`, minWidth: 32 + 24 * (cell + 3) }}>
              <Box />
              {Array.from({ length: 24 }, (_, hour) => <Typography color="text.secondary" key={hour} sx={{ fontSize: 10, textAlign: "center" }}>{hour % 3 === 0 ? hour : ""}</Typography>)}
              {rows.map((row, day) => (
                <Box key={weekdays[day]} sx={{ display: "contents" }}>
                  <Typography color="text.secondary" sx={{ fontSize: 10, lineHeight: `${cell}px` }}>{weekdays[day]}</Typography>
                  {row.map((slot) => <HeatCell key={slot.hour} label={describeSlot(slot)} level={slot.level} sx={{ height: cell }} />)}
                </Box>
              ))}
            </Box>
          </Box>
          <Stack sx={{ gap: 0.25, mt: 1.5 }}>
            {best.length > 0
              ? <Typography variant="body2"><strong>Best answered:</strong> {best.map((slot) => `${weekdays[slot.weekday - 1]} ${hourLabel(slot.hour)}`).join(", ")} UTC</Typography>
              : <Typography color="text.secondary" variant="body2">No hour has enough answered messages to call it best yet.</Typography>}
            <Typography color="text.secondary" variant="caption">A reply rate is only shaded where an hour has at least {minimumCellSample} messages; one lucky reply is not a pattern.</Typography>
          </Stack>
        </>
      )}
    </SectionPanel>
  );
}
