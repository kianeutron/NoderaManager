"use client";

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, useMediaQuery, useTheme } from "@mui/material";
import type { BaseSyntheticEvent, ReactNode } from "react";

type FormDialogProps = Readonly<{
  title: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (event: BaseSyntheticEvent) => void;
  /** Blocks closing and double submits while the request is in flight. */
  submitting: boolean;
  submitDisabled?: boolean;
  /** A failure the fields cannot show: a rejected request or a rule that spans fields. */
  error?: string | null;
  children: ReactNode;
}>;

/** A modal form: full-screen on phones, cancel and submit pinned at the bottom, the error above them. Entered data survives a failure. */
export function FormDialog({ title, submitLabel, onClose, onSubmit, submitting, submitDisabled = false, error = null, children }: FormDialogProps) {
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));

  return (
    <Dialog fullScreen={fullScreen} fullWidth maxWidth="sm" onClose={submitting ? undefined : onClose} open slotProps={{ paper: { component: "form", onSubmit } }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2.25, pt: 1 }}>
          {children}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={submitting} onClick={onClose}>Cancel</Button>
        <Button disabled={submitting || submitDisabled} type="submit" variant="contained">{submitting ? "Saving…" : submitLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
