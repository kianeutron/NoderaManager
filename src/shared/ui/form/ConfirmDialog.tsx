"use client";

import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

type ConfirmDialogProps = Readonly<{
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  pending: boolean;
  error?: string | null;
}>;

/** A deliberate yes/no for an action that changes a record's standing. */
export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose, pending, error = null }: ConfirmDialogProps) {
  return (
    <Dialog fullWidth maxWidth="xs" onClose={pending ? undefined : onClose} open>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={pending} onClick={onClose}>Cancel</Button>
        <Button disabled={pending} onClick={onConfirm} variant="contained">{pending ? "Working…" : confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
