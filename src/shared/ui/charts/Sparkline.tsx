"use client";

import { useId } from "react";
import { useChartColors } from "@/shared/ui/charts/use-chart-colors";

type SparklineProps = Readonly<{ values: readonly number[]; label: string; color?: string; height?: number }>;

/** The shape of a series with no axes: a trend to glance at, with the exact figures shown beside it. */
export function Sparkline({ values, label, color, height = 38 }: SparklineProps) {
  const gradient = useId().replaceAll(":", "");
  const colors = useChartColors();
  const stroke = color ?? colors.primary;
  const peak = Math.max(1, ...values);
  const step = values.length > 1 ? 100 / (values.length - 1) : 0;
  const points = values.map((value, index) => `${(index * step).toFixed(2)},${(32 - (value / peak) * 28).toFixed(2)}`);
  const line = points.length > 0 ? `M${points.join(" L")}` : "";

  return (
    <svg aria-label={label} height={height} preserveAspectRatio="none" role="img" viewBox="0 0 100 34" width="100%">
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.4" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient>
      </defs>
      {line ? <path d={`${line} L100,34 L0,34 Z`} fill={`url(#${gradient})`} /> : null}
      {line ? <path d={line} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" vectorEffect="non-scaling-stroke" /> : null}
    </svg>
  );
}
