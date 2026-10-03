"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import { Button } from "@mui/material";
import { useState } from "react";
import { LogOutreachForm } from "@/modules/outreach/ui/LogOutreachForm";

type LogOutreachDialogProps = Readonly<{ onSaved: (messageId: string) => void }>;

/** The "Log outreach" button and its form. The form mounts only while open, so each opening starts empty. */
export function LogOutreachDialog({ onSaved }: LogOutreachDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} startIcon={<AddRounded />} variant="contained">Log outreach</Button>
      {open ? <LogOutreachForm onClose={() => setOpen(false)} onSaved={(messageId) => { setOpen(false); onSaved(messageId); }} /> : null}
    </>
  );
}
