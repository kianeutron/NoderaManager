import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { heatOpacity, type HeatLevel } from "@/shared/ui/charts/heat-scale";

type HeatCellProps = Readonly<{ level: HeatLevel; label: string; sx?: SxProps<Theme> }>;

/** One square of a heat grid. The label is the tooltip and what assistive technology reads, so the shade is never the only signal. */
export function HeatCell({ level, label, sx }: HeatCellProps) {
  return (
    <Tooltip arrow title={label}>
      <Box aria-label={label} role="img" sx={[(theme: Theme) => ({ backgroundColor: alpha(theme.palette.primary.main, heatOpacity[level]), borderRadius: "4px", outline: level === 4 ? `1px solid ${alpha(theme.palette.primary.light, 0.9)}` : "none", transition: "transform 120ms ease", "&:hover": { transform: "scale(1.35)" } }), ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} />
    </Tooltip>
  );
}
