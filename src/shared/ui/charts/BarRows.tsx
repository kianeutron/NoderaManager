import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { shareOf } from "@/shared/ui/charts/percent-change";

export type BarRow = Readonly<{ key: string; label: string; value: number; /** Shown at the end of the row instead of the plain value. */ trailing?: ReactNode }>;

type BarRowsProps = Readonly<{ rows: readonly BarRow[]; label: string; /** The value a full bar stands for. Defaults to the biggest row. */ max?: number; labelWidth?: string }>;

/** Labelled horizontal bars in a list, each with its exact figure beside it. The one place this shape is drawn. */
export function BarRows({ rows, label, max, labelWidth = "38%" }: BarRowsProps) {
  const peak = max ?? Math.max(1, ...rows.map((row) => row.value));

  return (
    <Stack aria-label={label} component="ol" sx={{ gap: 0.75, listStyle: "none", m: 0, p: 0 }}>
      {rows.map((row) => (
        <Stack component="li" direction="row" key={row.key} sx={{ alignItems: "center", gap: 1.5 }}>
          <Typography color="text.secondary" noWrap sx={{ flex: `0 0 ${labelWidth}`, fontSize: 12 }}>{row.label}</Typography>
          <Box sx={(theme) => ({ backgroundColor: alpha(theme.palette.text.secondary, 0.08), borderRadius: 99, flex: 1, height: 10, overflow: "hidden" })}>
            <Box sx={(theme) => ({ background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, borderRadius: 99, height: "100%", minWidth: row.value > 0 ? 10 : 0, width: `${shareOf(row.value, peak) * 100}%` })} />
          </Box>
          <Typography component="div" sx={{ fontSize: 13, fontWeight: 700, minWidth: 28, textAlign: "right", whiteSpace: "nowrap" }}>{row.trailing ?? row.value.toLocaleString("en")}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}
