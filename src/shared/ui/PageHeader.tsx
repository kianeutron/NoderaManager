import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type PageHeaderProps = Readonly<{
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}>;

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 2.5, justifyContent: "space-between" }}>
      <Box>
        {eyebrow ? <Typography color="primary.light" variant="overline">{eyebrow}</Typography> : null}
        <Typography component="h1" variant="h4">{title}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 680 }}>
          {description}
        </Typography>
      </Box>
      {actions ? <Stack sx={{ alignItems: { md: "flex-end" }, justifyContent: "center" }}>{actions}</Stack> : null}
    </Stack>
  );
}
