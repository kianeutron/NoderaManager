import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

type TooltipEntry = Readonly<{ name?: string | number | undefined; value?: unknown; color?: string | undefined }>;
type ChartTooltipProps = Readonly<{ active?: boolean | undefined; label?: string | number | undefined; payload?: readonly TooltipEntry[] | undefined; formatLabel?: (label: string) => string }>;

/** The tooltip body every Recharts chart uses, in the same glass as the panels. */
export function ChartTooltip({ active, label, payload, formatLabel = String }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <Box sx={(theme) => ({ backgroundColor: alpha(theme.palette.background.paper, 0.9), border: `1px solid ${alpha(theme.palette.primary.light, 0.3)}`, borderRadius: 2, boxShadow: `0 12px 30px ${alpha("#000615", 0.4)}`, minWidth: 140, px: 1.5, py: 1 })}>
      {label === undefined ? null : <Typography sx={{ fontWeight: 700 }} variant="caption">{formatLabel(String(label))}</Typography>}
      <Stack sx={{ gap: 0.25, mt: label === undefined ? 0 : 0.5 }}>
        {payload.map((entry) => (
          <Stack direction="row" key={String(entry.name)} sx={{ alignItems: "center", gap: 1, justifyContent: "space-between" }}>
            <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}><Box sx={{ backgroundColor: entry.color, borderRadius: "50%", height: 8, width: 8 }} /><Typography color="text.secondary" variant="caption">{entry.name}</Typography></Stack>
            <Typography sx={{ fontWeight: 700 }} variant="caption">{typeof entry.value === "number" ? entry.value.toLocaleString("en") : String(entry.value)}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
