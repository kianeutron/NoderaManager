"use client";

import EventBusyRounded from "@mui/icons-material/EventBusyRounded";
import EventNoteRounded from "@mui/icons-material/EventNoteRounded";
import EventRepeatRounded from "@mui/icons-material/EventRepeatRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import { Box } from "@mui/material";
import { useFollowUpSummary } from "@/modules/followups/ui/use-followup-queries";
import { MetricCard } from "@/shared/ui/MetricCard";

/** Active follow-ups by when they are due, counted over all of them. While loading, or if the counts fail, a dash: the list below still works. */
export function FollowUpSummaryCards() {
  const { data } = useFollowUpSummary();
  const show = (value: number | undefined) => (value === undefined ? "—" : value.toLocaleString("en"));

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
      <MetricCard icon={<EventBusyRounded fontSize="small" />} label="Overdue" tone="warning" value={show(data?.overdue)} />
      <MetricCard icon={<EventRounded fontSize="small" />} label="Next 7 days" value={show(data?.next7Days)} />
      <MetricCard icon={<EventRepeatRounded fontSize="small" />} label="Later" value={show(data?.later)} />
      <MetricCard icon={<EventNoteRounded fontSize="small" />} label="No date" value={show(data?.noDate)} />
    </Box>
  );
}
