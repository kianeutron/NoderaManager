import { Stack, Typography } from "@mui/material";
import type { Insights } from "@/modules/analytics/domain/analytics.types";
import { describeFunnel } from "@/modules/analytics/ui/funnel-presentation";
import { BarRows } from "@/shared/ui/charts/BarRows";
import { formatPercent, shareOf } from "@/shared/ui/charts/percent-change";
import { SectionPanel } from "@/shared/ui/SectionPanel";

/** Where prospects fall away, from messaged to a commercial step. Depth steps only count replies you classified. */
export function ConversionFunnel({ funnel }: Readonly<{ funnel: Insights["funnel"] }>) {
  const rows = describeFunnel(funnel.steps);
  const reached = rows[0]?.prospects ?? 0;

  return (
    <SectionPanel description="Prospects messaged in this window, narrowed step by step" title="Conversion funnel">
      {reached === 0 ? <Typography color="text.secondary">No one was messaged in this window.</Typography> : (
        <Stack sx={{ gap: 2 }}>
          <BarRows
            label="Prospects at each funnel step"
            labelWidth="40%"
            max={reached}
            rows={rows.map((row) => ({
              key: row.step, label: row.label, value: row.prospects,
              trailing: <>{row.prospects.toLocaleString("en")}<Typography color="text.secondary" component="span" sx={{ fontSize: 11, ml: 0.75 }}>{formatPercent(row.ofReached)}</Typography></>
            }))}
          />
          <Typography color="text.secondary" variant="caption">
            Won: {funnel.won.toLocaleString("en")} of {reached.toLocaleString("en")} prospects messaged ({formatPercent(shareOf(funnel.won, reached))}), whatever step they reached.
            Steps from &ldquo;asked a question&rdquo; on use the depth you set when logging a reply, so they undercount until you classify replies.
          </Typography>
        </Stack>
      )}
    </SectionPanel>
  );
}
