"use client";

import Google from "@mui/icons-material/Google";
import { Alert, Button, Stack } from "@mui/material";
import { createAuthClient } from "@neondatabase/neon-js/auth/next";
import { useState } from "react";
import { signInUnavailableMessage } from "@/modules/auth/ui/sign-in-errors";

const authClient = createAuthClient();

type SignInButtonProps = Readonly<{
  /** A failure from an earlier attempt, passed back through the URL. */
  initialNotice: string | null;
}>;

export function SignInButton({ initialNotice }: SignInButtonProps) {
  const [notice, setNotice] = useState(initialNotice);
  const [starting, setStarting] = useState(false);

  async function signIn() {
    setStarting(true);
    setNotice(null);
    try {
      const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (error) throw error;
      // Success navigates away to Google; the button stays disabled until then.
    } catch {
      setNotice(signInUnavailableMessage);
      setStarting(false);
    }
  }

  return (
    <Stack sx={{ gap: 1.5 }}>
      <Button disabled={starting} fullWidth onClick={() => void signIn()} startIcon={<Google />} variant="contained">{starting ? "Opening Google…" : "Continue with Google"}</Button>
      {notice ? <Alert severity="error">{notice}</Alert> : null}
    </Stack>
  );
}
