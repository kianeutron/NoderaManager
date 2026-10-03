import { Box, ListItemButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";

type EntityRowProps = Readonly<{
  avatar: ReactNode;
  title: string;
  subtitle?: string | null;
  /** Chips or badges shown under the text. */
  meta?: ReactNode;
  /** Small right-aligned text; hidden on narrow screens where the preview shows it. */
  trailing?: string | null;
  selected: boolean;
  onSelect: () => void;
}>;

/** One selectable record in a list: avatar, two lines of text, optional chips. The whole row is one button. */
export function EntityRow({ avatar, title, subtitle, meta, trailing, selected, onSelect }: EntityRowProps) {
  return (
    <ListItemButton
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      selected={selected}
      sx={(theme) => ({
        alignItems: "flex-start",
        border: `1px solid ${selected ? theme.palette.primary.main : alpha(theme.palette.primary.light, 0.14)}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        gap: 1.5,
        px: 1.5,
        py: 1.25,
        "&.Mui-selected": { backgroundColor: alpha(theme.palette.primary.main, 0.12) }
      })}
    >
      <Box sx={{ flexShrink: 0, pt: 0.25 }}>{avatar}</Box>
      <Stack sx={{ flex: 1, gap: 0.5, minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 700 }} variant="body2">{title}</Typography>
        {subtitle ? <Typography color="text.secondary" noWrap variant="caption">{subtitle}</Typography> : null}
        {meta ? <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, pt: 0.25 }}>{meta}</Stack> : null}
      </Stack>
      {trailing ? <Typography color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, flexShrink: 0, pt: 0.25 }} variant="caption">{trailing}</Typography> : null}
    </ListItemButton>
  );
}
