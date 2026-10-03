import { Box } from "@mui/material";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { KpiTile } from "@/modules/analytics/ui/KpiTile";
import { rangeLabel } from "@/modules/analytics/ui/overview-presentation";
import { RateTile } from "@/modules/analytics/ui/RateTile";
import { Sparkline } from "@/shared/ui/charts/Sparkline";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";

type KpiStripProps = Readonly<{ overview: Pick<Overview, "totals" | "activity" | "range"> }>;

const perMessage = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

export function KpiStrip({ overview: { totals, activity, range } }: KpiStripProps) {
  const colors = useChartColors();
  const window = rangeLabel[range];

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" } }}>
      <KpiTile caption={`Messages logged in the last ${window}`} label="Messages sent" previous={totals.sent.previous} value={totals.sent.current} visual={<Sparkline label="Messages sent per day" values={activity.map((day) => day.sent)} />} />
      <KpiTile
        caption={totals.reached.current === 0 ? "No one messaged yet in this window" : `${perMessage(totals.sent.current / totals.reached.current)} messages per prospect`}
        label="Prospects reached" previous={totals.reached.previous} value={totals.reached.current}
      />
      <KpiTile caption="Real replies, auto-replies left out" label="Replies received" previous={totals.replies.previous} value={totals.replies.current} visual={<Sparkline color={colors.success} label="Replies per day" values={activity.map((day) => day.replies)} />} />
      <RateTile color={colors.warning} label="Reply rate" rate={totals.replyRate} unit="prospects replied" />
    </Box>
  );
}
