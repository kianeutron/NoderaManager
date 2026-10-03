"use client";

import CampaignRounded from "@mui/icons-material/CampaignRounded";
import MarkEmailReadRounded from "@mui/icons-material/MarkEmailReadRounded";
import ReplyRounded from "@mui/icons-material/ReplyRounded";
import ScheduleRounded from "@mui/icons-material/ScheduleRounded";
import { Box } from "@mui/material";
import { useOutreachSummary } from "@/modules/outreach/ui/use-outreach-queries";
import { MetricCard } from "@/shared/ui/MetricCard";

/** Totals over every message, not over what is on screen. While loading, or if the totals fail, a dash: the list below still works. */
export function OutreachSummaryCards() {
  const { data } = useOutreachSummary();
  const show = (value: number | undefined) => (value === undefined ? "—" : value.toLocaleString("en"));

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
      <MetricCard icon={<CampaignRounded fontSize="small" />} label="Logged messages" value={show(data?.total)} />
      <MetricCard icon={<ScheduleRounded fontSize="small" />} label="Last 7 days" value={show(data?.last7Days)} />
      <MetricCard icon={<MarkEmailReadRounded fontSize="small" />} label="Delivered" tone="success" value={show(data?.delivered)} />
      <MetricCard icon={<ReplyRounded fontSize="small" />} label="Replies" tone="warning" value={show(data?.replied)} />
    </Box>
  );
}
