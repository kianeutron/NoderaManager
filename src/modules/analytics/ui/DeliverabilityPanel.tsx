import { Box, Stack, Typography } from "@mui/material";
import type { Insights } from "@/modules/analytics/domain/analytics.types";
import { BarRows } from "@/shared/ui/charts/BarRows";
import { SectionPanel } from "@/shared/ui/SectionPanel";

type DeliverabilityPanelProps = Readonly<{ deliverability: Insights["deliverability"]; bounceRate: Insights["totals"]["bounceRate"] }>;

const segments = [
  { key: "delivered", label: "Confirmed delivered", color: "success.main" },
  { key: "unconfirmed", label: "Unconfirmed", color: "text.disabled" },
  { key: "failed", label: "Failed", color: "error.main" }
] as const;

/** Whether messages arrived. A message counts as delivered only when a provider confirmed it; the rest is unconfirmed, not lost. */
export function DeliverabilityPanel({ deliverability, bounceRate }: DeliverabilityPanelProps) {
  const { sent, bounces } = deliverability;
  const { part, whole } = bounceRate.current;

  return (
    <SectionPanel description="Delivery and bounces in this window" title="Deliverability">
      {sent === 0 ? <Typography color="text.secondary">Nothing was sent in this window.</Typography> : (
        <Stack sx={{ gap: 2.25 }}>
          <Box>
            <Box aria-hidden sx={{ borderRadius: 99, display: "flex", height: 10, overflow: "hidden" }}>
              {segments.map((segment) => <Box key={segment.key} sx={{ backgroundColor: segment.color, flex: deliverability[segment.key], minWidth: deliverability[segment.key] > 0 ? 4 : 0 }} />)}
            </Box>
            <Stack component="ul" direction="row" sx={{ flexWrap: "wrap", gap: 2, listStyle: "none", m: 0, mt: 1, p: 0 }}>
              {segments.map((segment) => (
                <Stack component="li" direction="row" key={segment.key} sx={{ alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ backgroundColor: segment.color, borderRadius: "50%", height: 8, width: 8 }} />
                  <Typography color="text.secondary" variant="caption">{segment.label} {deliverability[segment.key].toLocaleString("en")}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, mb: 0.75 }} variant="body2">Bounces: {part} of {whole} {whole === 1 ? "email" : "emails"}</Typography>
            <BarRows label="Bounces by kind" labelWidth="30%" max={Math.max(1, bounces.soft, bounces.hard, bounces.blocked)} rows={[{ key: "soft", label: "Soft", value: bounces.soft }, { key: "hard", label: "Hard", value: bounces.hard }, { key: "blocked", label: "Blocked", value: bounces.blocked }]} />
          </Box>
        </Stack>
      )}
    </SectionPanel>
  );
}
