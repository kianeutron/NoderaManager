"use client";

import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { Button, Stack, Typography } from "@mui/material";
import { GlassPanel } from "@/shared/ui/GlassPanel";

/** Shown when a page fails while rendering. The error itself is never displayed: Next logs it on the server, and its digest is the reference for finding that log line. */
export default function GlobalError({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <Stack sx={{ alignItems: "center", justifyContent: "center", minHeight: "100vh", p: 3 }}>
      <GlassPanel role="alert" sx={{ maxWidth: 520, p: 4, textAlign: "center" }}>
        <Typography variant="h5">This view could not load</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>No data has been changed. Try loading the workspace again.</Typography>
        {error.digest ? <Typography color="text.secondary" sx={{ mt: 1 }} variant="caption">Reference: {error.digest}</Typography> : null}
        <Button onClick={reset} startIcon={<RefreshRounded />} sx={{ display: "flex", mt: 2, mx: "auto" }} variant="contained">Try again</Button>
      </GlassPanel>
    </Stack>
  );
}
