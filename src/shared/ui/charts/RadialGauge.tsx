"use client";

import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";

type RadialGaugeProps = Readonly<{ share: number; label: string; size?: number; thickness?: number; color?: string; children?: ReactNode }>;

/** A ring filled to `share` (0 to 1), with anything centred inside it. The label states the figure for assistive technology. */
export function RadialGauge({ share, label, size = 84, thickness = 8, color, children }: RadialGaugeProps) {
  const colors = useChartColors();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const stroke = color ?? colors.primary;

  return (
    <Box aria-label={label} role="img" sx={{ display: "grid", flex: "0 0 auto", height: size, placeItems: "center", position: "relative", width: size }}>
      <svg height={size} style={{ position: "absolute", transform: "rotate(-90deg)" }} width={size}>
        <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={alpha(stroke, 0.16)} strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke={stroke} strokeDasharray={`${circumference * share} ${circumference}`} strokeLinecap="round" strokeWidth={thickness} style={{ transition: "stroke-dasharray 700ms cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <Box sx={{ position: "relative", textAlign: "center" }}>{children}</Box>
    </Box>
  );
}
