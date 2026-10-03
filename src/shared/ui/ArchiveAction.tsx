"use client";

import ArchiveRounded from "@mui/icons-material/ArchiveRounded";
import UnarchiveRounded from "@mui/icons-material/UnarchiveRounded";
import { Button } from "@mui/material";
import { useState } from "react";
import { describeError } from "@/shared/api/error-copy";
import { ConfirmDialog } from "@/shared/ui/form/ConfirmDialog";

type ArchiveActionProps = Readonly<{
  archived: boolean;
  /** What the record is: "person", "company". */
  noun: string;
  name: string;
  pending: boolean;
  error: unknown;
  /** Performs the change. Archiving asks first; restoring is harmless and does not. */
  onChange: (archive: boolean) => Promise<unknown>;
}>;

/** Archive (with a confirmation) or Restore for one record. Nothing is ever deleted, so both directions are reversible. */
export function ArchiveAction({ archived, noun, name, pending, error, onChange }: ArchiveActionProps) {
  const [confirming, setConfirming] = useState(false);

  if (archived) {
    return <Button disabled={pending} onClick={() => void onChange(false).catch(() => undefined)} startIcon={<UnarchiveRounded />} variant="contained">{pending ? "Restoring…" : "Restore"}</Button>;
  }

  return (
    <>
      <Button color="inherit" onClick={() => setConfirming(true)} startIcon={<ArchiveRounded />}>Archive</Button>
      {confirming ? (
        <ConfirmDialog
          confirmLabel="Archive"
          description={`${name} will be hidden from lists and searches. Its history stays, and you can restore this ${noun} any time.`}
          error={error ? describeError(error, noun) : null}
          onClose={() => setConfirming(false)}
          onConfirm={() => void onChange(true).then(() => setConfirming(false), () => undefined)}
          pending={pending}
          title={`Archive this ${noun}?`}
        />
      ) : null}
    </>
  );
}
