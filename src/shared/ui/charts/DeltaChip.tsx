import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { changeBetween } from "@/shared/ui/charts/percent-change";

type DeltaChipProps = Readonly<{ current: number; previous: number; /** Which way is an improvement. A bounce rate going up is not good news. */ goodDirection?: "up" | "down" }>;

const wording = { up: "up", down: "down", flat: "unchanged", new: "new" } as const;

/** How a figure moved against the period before, in words as well as color and arrow. */
export function DeltaChip({ current, previous, goodDirection = "up" }: DeltaChipProps) {
  const { direction, percent } = changeBetween(current, previous);
  // "New" is a rise from nothing.
  const improved = (direction === "down" ? "down" : "up") === goodDirection;
  const color = direction === "flat" ? "text.secondary" : improved ? "success.main" : "warning.main";
  const text = direction === "up" || direction === "down" ? `${percent}%` : direction === "new" ? "New" : "No change";
  const Icon = direction === "up" || direction === "new" ? ArrowUpwardRounded : direction === "down" ? ArrowDownwardRounded : RemoveRounded;

  return (
    <Box aria-label={`${wording[direction]}${direction === "up" || direction === "down" ? ` ${percent}%` : ""} against the period before`} role="img" sx={(theme) => ({ alignItems: "center", backgroundColor: alpha(theme.palette.text.secondary, 0.1), borderRadius: 99, color, display: "inline-flex", gap: 0.25, px: 0.75, py: 0.25 })}>
      <Icon sx={{ fontSize: 13 }} />
      <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{text}</Typography>
    </Box>
  );
}
