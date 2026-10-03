import { Box } from "@mui/material";
import type { Insights } from "@/modules/analytics/domain/analytics.types";
import { KpiTile } from "@/modules/analytics/ui/KpiTile";
import { rangeLabel } from "@/modules/analytics/ui/overview-presentation";
import { RateTile } from "@/modules/analytics/ui/RateTile";
import { formatHours } from "@/shared/lib/format-duration";
import { Sparkline } from "@/shared/ui/charts/Sparkline";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";

type AnalyticsKpisProps = Readonly<{ insights: Pick<Insights, "totals" | "trend" | "range" | "responseTime"> }>;

const perMessage = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** The five figures that say how outreach is going: volume, reach, answers, bounces and how fast answers come. */
export function AnalyticsKpis({ insights: { totals, trend, range, responseTime } }: AnalyticsKpisProps) {
  const colors = useChartColors();

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" } }}>
      <KpiTile caption={`Messages logged in the last ${rangeLabel[range]}`} label="Messages sent" previous={totals.sent.previous} value={totals.sent.current} visual={<Sparkline label="Messages sent over time" values={trend.map((point) => point.sent)} />} />
      <KpiTile caption={totals.reached.current === 0 ? "No one messaged yet in this window" : `${perMessage(totals.sent.current / totals.reached.current)} messages per prospect`} label="Prospects reached" previous={totals.reached.previous} value={totals.reached.current} />
      <RateTile color={colors.warning} label="Reply rate" rate={totals.replyRate} unit="prospects replied" />
      <RateTile color={colors.error} label="Bounce rate" lowerIsBetter rate={totals.bounceRate} unit="emails bounced" />
      <KpiTile caption={responseTime.sample === 0 ? "No replies to time yet" : `Median of ${responseTime.sample.toLocaleString("en")} first ${responseTime.sample === 1 ? "reply" : "replies"}`} format={formatHours} label="Time to reply" value={responseTime.medianHours} />
    </Box>
  );
}
