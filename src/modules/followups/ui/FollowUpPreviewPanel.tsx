"use client";

import BusinessRounded from "@mui/icons-material/BusinessRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import { Alert, Button, Stack } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { DismissFollowUpDialog } from "@/modules/followups/ui/DismissFollowUpDialog";
import { FollowUpForm } from "@/modules/followups/ui/FollowUpForm";
import { FollowUpPreview } from "@/modules/followups/ui/FollowUpPreview";
import { useCompleteFollowUp } from "@/modules/followups/ui/use-followup-mutations";
import { useFollowUp } from "@/modules/followups/ui/use-followup-queries";
import { describeError } from "@/shared/api/error-copy";
import { PreviewFrame } from "@/shared/ui/PreviewFrame";
import { PreviewQueryBoundary } from "@/shared/ui/PreviewQueryBoundary";

type FollowUpPreviewPanelProps = Readonly<{ followUpId: string; onClose: () => void }>;

/** An active follow-up can be done, edited or let go; a finished one is a record and can only be read, with links to who it was about. */
export function FollowUpPreviewPanel({ followUpId, onClose }: FollowUpPreviewPanelProps) {
  const query = useFollowUp(followUpId);
  const complete = useCompleteFollowUp();
  const [dialog, setDialog] = useState<"edit" | "dismiss" | null>(null);
  // One clock per opening, so "overdue" does not flicker while the panel is open.
  const [now] = useState(() => new Date());
  const closeDialog = () => setDialog(null);

  return (
    <PreviewQueryBoundary noun="follow-up" onClose={onClose} query={query}>
      {(followUp) => (
        <>
          <PreviewFrame
            footer={(
              <Stack sx={{ gap: 1.5 }}>
                {complete.error ? <Alert severity="error">{describeError(complete.error, "follow-up")}</Alert> : null}
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
                  {followUp.status === "active" ? (
                    <>
                      <Button disabled={complete.isPending} onClick={() => complete.mutate(followUp.id)} startIcon={<CheckRounded />} variant="contained">{complete.isPending ? "Completing…" : "Complete"}</Button>
                      <Button onClick={() => setDialog("edit")} startIcon={<EditRounded />} variant="outlined">Edit</Button>
                      <Button color="inherit" onClick={() => setDialog("dismiss")}>Dismiss</Button>
                    </>
                  ) : null}
                  {followUp.person ? <Button component={Link} href={`/people?id=${followUp.person.id}`} startIcon={<PersonRounded />} variant="outlined">Open person</Button> : null}
                  {followUp.organization ? <Button component={Link} href={`/people?view=companies&id=${followUp.organization.id}`} startIcon={<BusinessRounded />} variant="outlined">Open company</Button> : null}
                </Stack>
              </Stack>
            )}
            onClose={onClose}
          >
            <FollowUpPreview followUp={followUp} now={now} />
          </PreviewFrame>
          {dialog === "edit" ? <FollowUpForm followUp={followUp} onClose={closeDialog} onSaved={closeDialog} /> : null}
          {dialog === "dismiss" ? <DismissFollowUpDialog followUpId={followUp.id} onClose={closeDialog} /> : null}
        </>
      )}
    </PreviewQueryBoundary>
  );
}
