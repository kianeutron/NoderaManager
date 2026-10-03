import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/shared/ui/charts/AnimatedNumber";
import { DeltaChip } from "@/shared/ui/charts/DeltaChip";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type KpiTileProps = Readonly<{
  label: string;
  /** `null` when there is nothing to measure (no replies yet to time), shown as a dash with no movement. */
  value: number | null;
  format?: ((value: number) => string) | undefined;
  /** The same figure for the period before, to show how it moved. */
  previous?: number | undefined;
  /** Set when a rise is bad news, as with a bounce rate. */
  lowerIsBetter?: boolean;
  /** A trend or ring shown beside the figure, when the figure has a shape worth showing. */
  visual?: ReactNode;
  /** What the figure is made of, in words. Percentages must say what they are a percentage of. */
  caption: ReactNode;
}>;

/** One headline figure: the number, how it moved, a glanceable shape, and what it is made of. */
export function KpiTile({ label, value, format, previous, lowerIsBetter = false, visual, caption }: KpiTileProps) {
  return (
    <GlassPanel sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2.25 }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography color="text.secondary" variant="body2">{label}</Typography>
        {previous === undefined || value === null ? null : <DeltaChip current={value} goodDirection={lowerIsBetter ? "down" : "up"} previous={previous} />}
      </Stack>
      <Stack direction="row" sx={{ alignItems: "flex-end", gap: 2, justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1 }}>
          {value === null ? "—" : <AnimatedNumber format={format} value={value} />}
        </Typography>
        {visual ? <Box sx={{ flex: "1 1 0", maxWidth: 140, minWidth: 64 }}>{visual}</Box> : null}
      </Stack>
      <Typography color="text.secondary" variant="caption">{caption}</Typography>
    </GlassPanel>
  );
}
