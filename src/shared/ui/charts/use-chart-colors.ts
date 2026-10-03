"use client";

import { alpha, useTheme } from "@mui/material/styles";

/** Chart colors taken from the selected theme, so every chart follows the theme instead of carrying its own hex values. */
export function useChartColors() {
  const { palette } = useTheme();
  const accents = [palette.primary.main, palette.secondary.main, palette.success.main, palette.warning.main];
  return {
    primary: palette.primary.main,
    primaryLight: palette.primary.light,
    secondary: palette.secondary.main,
    success: palette.success.main,
    warning: palette.warning.main,
    error: palette.error.main,
    text: palette.text.secondary,
    grid: alpha(palette.text.secondary, 0.16),
    /** The color for the nth category of a chart that has no natural colors, cycling through the theme's accents. */
    seriesAt: (index: number) => accents[index % accents.length] ?? palette.primary.main
  } as const;
}
