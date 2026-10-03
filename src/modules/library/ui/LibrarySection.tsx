import { Box, Stack, Typography } from "@mui/material";
import { useId, type ReactNode } from "react";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type LibrarySectionProps = Readonly<{ title: string; action?: ReactNode; children: ReactNode }>;

export function LibrarySection({ title, action, children }: LibrarySectionProps) {
  const headingId = useId();

  return (
    <GlassPanel aria-labelledby={headingId} role="region" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography component="h2" id={headingId} variant="h6">{title}</Typography>
        {action ? <Box>{action}</Box> : null}
      </Stack>
      {children}
    </GlassPanel>
  );
}
