"use client";

import BusinessRounded from "@mui/icons-material/BusinessRounded";
import EventRepeatRounded from "@mui/icons-material/EventRepeatRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import { Button, Stack } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { FollowUpForm } from "@/modules/followups/ui/FollowUpForm";
import { InteractionsSection } from "@/modules/interactions/ui/InteractionsSection";
import { OutreachPreview } from "@/modules/outreach/ui/OutreachPreview";
import { useOutreachMessage } from "@/modules/outreach/ui/use-outreach-queries";
import { PreviewFrame } from "@/shared/ui/PreviewFrame";
import { PreviewQueryBoundary } from "@/shared/ui/PreviewQueryBoundary";

type OutreachPreviewPanelProps = Readonly<{ messageId: string; onClose: () => void }>;

/** A sent message is a record of what happened, so the panel reads it and links to who it went to; nothing here edits it. */
export function OutreachPreviewPanel({ messageId, onClose }: OutreachPreviewPanelProps) {
  const query = useOutreachMessage(messageId);
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);

  return (
    <PreviewQueryBoundary noun="message" onClose={onClose} query={query}>
      {(message) => (
        <>
          <PreviewFrame
            footer={(
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
                <Button onClick={() => setSchedulingFollowUp(true)} startIcon={<EventRepeatRounded />} variant="contained">Schedule follow-up</Button>
                {message.person ? <Button component={Link} href={`/people?id=${message.person.id}`} startIcon={<PersonRounded />} variant="outlined">Open person</Button> : null}
                {message.organization ? <Button component={Link} href={`/people?view=companies&id=${message.organization.id}`} startIcon={<BusinessRounded />} variant="outlined">Open company</Button> : null}
              </Stack>
            )}
            onClose={onClose}
          >
            <Stack sx={{ gap: 3 }}>
              <OutreachPreview message={message} />
              <InteractionsSection message={{ id: message.id, channel: message.channel }} prospectId={message.prospectId} />
            </Stack>
          </PreviewFrame>
          {schedulingFollowUp ? <FollowUpForm onClose={() => setSchedulingFollowUp(false)} onSaved={() => setSchedulingFollowUp(false)} origin={{ prospectId: message.prospectId, originOutreachMessageId: message.id, label: message.person?.fullName ?? message.organization?.name ?? "this prospect" }} /> : null}
        </>
      )}
    </PreviewQueryBoundary>
  );
}
