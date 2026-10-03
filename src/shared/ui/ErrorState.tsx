import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { Button, Stack, Typography } from "@mui/material";
import { GlassPanel } from "@/shared/ui/GlassPanel";

type ErrorStateProps = Readonly<{ title: string; description: string; onRetry?: () => void }>;

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <GlassPanel role="alert" sx={{ p: 4, textAlign: "center" }}>
      <Stack spacing={1.25} sx={{ alignItems: "center" }}>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
        {onRetry ? <Button onClick={onRetry} startIcon={<RefreshRounded />} variant="outlined">Try again</Button> : null}
      </Stack>
    </GlassPanel>
  );
}
