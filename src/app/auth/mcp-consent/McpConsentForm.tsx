"use client";

import { Alert, Button, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type ConsentResponse = Readonly<{ redirect_uri?: string }>;

export function McpConsentForm() {
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ accept, oauth_query: searchParams.toString() })
      });
      const payload = (await response.json()) as ConsentResponse;
      if (!response.ok || !payload.redirect_uri) throw new Error("The authorization request could not be completed.");
      window.location.assign(payload.redirect_uri);
    } catch {
      setError("The authorization request could not be completed. Please close this window and try again.");
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 12 } }}>
      <Paper elevation={0} sx={{ border: 1, borderColor: "divider", p: { xs: 3, sm: 5 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography color="text.secondary" variant="overline">Nodera authorization</Typography>
            <Typography variant="h4">Connect your workspace</Typography>
            <Typography color="text.secondary">ChatGPT is requesting access to your private Nodera workspace. Only the approved workspace owner can authorize this connection.</Typography>
          </Stack>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.5}>
            <Button disabled={submitting} fullWidth onClick={() => void respond(false)} variant="outlined">Deny</Button>
            <Button disabled={submitting} fullWidth onClick={() => void respond(true)} variant="contained">
              {submitting ? <CircularProgress color="inherit" size={20} /> : "Allow access"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
