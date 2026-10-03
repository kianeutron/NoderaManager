import { Box } from "@mui/material";
import type { ReactNode } from "react";

/** One column on small screens, twelve from `lg` up. Place content with `GridCell`. */
export function DashboardGrid({ children }: Readonly<{ children: ReactNode }>) {
  return <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(12, minmax(0, 1fr))" } }}>{children}</Box>;
}

type GridCellProps = Readonly<{ span: number; /** Rows to span from `lg` up, for a tall cell beside two short ones. */ rows?: number; children: ReactNode }>;

export function GridCell({ span, rows = 1, children }: GridCellProps) {
  return <Box sx={{ gridColumn: { lg: `span ${span}` }, gridRow: { lg: `span ${rows}` }, minWidth: 0 }}>{children}</Box>;
}
