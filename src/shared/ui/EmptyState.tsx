import InboxRounded from "@mui/icons-material/InboxRounded";
import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type EmptyStateProps = Readonly<{ title: string; description: string; action?: ReactNode }>;

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <GlassPanel sx={{ p: 4, textAlign: "center" }}>
      <Stack spacing={1.25} sx={{ alignItems: "center" }}>
        <InboxRounded color="primary" fontSize="large" />
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
        {action}
      </Stack>
    </GlassPanel>
  );
}
