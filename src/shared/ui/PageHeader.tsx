import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type PageHeaderProps = Readonly<{
  eyebrow?: string;
  title: string;
  /** Kept for page-level compatibility; the compact header intentionally omits supporting copy. */
  description: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
}>;

export function PageHeader({ eyebrow, title, actions, toolbar }: PageHeaderProps) {
  return (
    <Stack sx={{ gap: toolbar ? 2 : 0 }}>
      <Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: { md: "center" }, gap: { xs: 1.5, md: 2 }, justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          {eyebrow ? <Typography color="primary.light" variant="overline">{eyebrow}</Typography> : null}
          <Typography component="h1" sx={{ lineHeight: 1.12 }} variant="h4">{title}</Typography>
        </Box>
        {actions ? <Stack sx={{ alignItems: { xs: "stretch", md: "flex-end" }, flexShrink: 0, justifyContent: "center" }}>{actions}</Stack> : null}
      </Stack>
      {toolbar}
    </Stack>
  );
}
