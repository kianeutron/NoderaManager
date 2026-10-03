import TrendingUpRounded from "@mui/icons-material/TrendingUpRounded";
import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type MetricCardProps = Readonly<{
  label: string;
  value: string;
  /** A trend line under the value. Omit it for a plain count. */
  change?: string;
  icon: ReactNode;
  tone?: "primary" | "success" | "warning";
}>;

export function MetricCard({ label, value, change, icon, tone = "primary" }: MetricCardProps) {
  const color = tone === "success" ? "success.main" : tone === "warning" ? "warning.main" : "primary.main";

  return (
    <GlassPanel sx={{ p: 2.25 }}>
      <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box>
          <Typography color="text.secondary" variant="body2">{label}</Typography>
          <Typography sx={{ mt: 0.75 }} variant="h5">{value}</Typography>
        </Box>
        <Box sx={(theme) => ({ alignItems: "center", backgroundColor: theme.palette[tone].main + "20", borderRadius: 2, color, display: "flex", height: 38, justifyContent: "center", width: 38 })}>
          {icon}
        </Box>
      </Stack>
      {change ? (
        <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mt: 2 }}>
          <TrendingUpRounded sx={{ color, fontSize: 16 }} />
          <Typography color={color} variant="caption">{change}</Typography>
          <Typography color="text.disabled" variant="caption">vs. last week</Typography>
        </Stack>
      ) : null}
    </GlassPanel>
  );
}
