"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { layoutCalendar, type CalendarCell } from "@/modules/analytics/ui/calendar-layout";
import { formatDay, formatWeekday } from "@/modules/analytics/ui/overview-presentation";
import { HeatCell } from "@/shared/ui/charts/HeatCell";
import { SectionPanel } from "@/shared/ui/SectionPanel";

const weekdayLabels = ["Mon", "", "Wed", "", "Fri", "", ""] as const;
const cell = 14;
const gap = 4;

const describeCell = ({ date, sent, replies }: CalendarCell) => `${formatWeekday(date)} ${formatDay(date)}: ${sent} sent, ${replies} ${replies === 1 ? "reply" : "replies"}`;

/** Half a year of days at a glance, darker where more was sent, so a quiet stretch shows before it becomes a gap in the pipeline. */
export function ActivityCalendar({ calendar }: Readonly<{ calendar: Overview["calendar"] }>) {
  const { weeks, months, activeDays, total, busiest, streak } = layoutCalendar(calendar);

  return (
    <SectionPanel description="Messages sent per day, last 26 weeks" title="Rhythm">
      <Box sx={{ overflowX: "auto", pb: 1 }}>
        <Box sx={{ display: "grid", gap: `${gap}px`, gridTemplateColumns: `24px repeat(${weeks.length}, ${cell}px)`, gridTemplateRows: `14px repeat(7, ${cell}px)`, minWidth: "max-content" }}>
          {months.map((month) => <Typography color="text.secondary" key={`${month.label}-${month.week}`} sx={{ fontSize: 10, gridColumn: month.week + 2, gridRow: 1, whiteSpace: "nowrap" }}>{month.label}</Typography>)}
          {weekdayLabels.map((name, row) => <Typography color="text.secondary" key={`weekday-${row}`} sx={{ fontSize: 10, gridColumn: 1, gridRow: row + 2, lineHeight: `${cell}px` }}>{name}</Typography>)}
          {weeks.flatMap((week, weekIndex) => week.map((day, row) => day ? (
            <HeatCell key={day.date} label={describeCell(day)} level={day.level} sx={{ gridColumn: weekIndex + 2, gridRow: row + 2 }} />
          ) : null))}
        </Box>
      </Box>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: { xs: 2, sm: 4 }, mt: 1.5 }}>
        <Stat label="Sent" value={total.toLocaleString("en")} />
        <Stat label="Active days" value={`${activeDays}`} />
        <Stat label="Current streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
        <Stat label="Busiest day" value={busiest ? `${formatDay(busiest.date)} · ${busiest.sent}` : "—"} />
      </Stack>
    </SectionPanel>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return <Box><Typography color="text.secondary" variant="caption">{label}</Typography><Typography sx={{ fontWeight: 700 }}>{value}</Typography></Box>;
}
