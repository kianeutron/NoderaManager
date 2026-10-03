"use client";

import AddCommentRounded from "@mui/icons-material/AddCommentRounded";
import ForumRounded from "@mui/icons-material/ForumRounded";
import MailLockRounded from "@mui/icons-material/MailLockRounded";
import { Button, Skeleton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import type { InteractionChannel } from "@/modules/interactions/domain/interaction.types";
import type { LoggableInteractionType } from "@/modules/interactions/ui/interaction-form";
import { InteractionTimelineItem } from "@/modules/interactions/ui/InteractionTimelineItem";
import { LogInteractionForm } from "@/modules/interactions/ui/LogInteractionForm";
import { ReportBounceForm } from "@/modules/interactions/ui/ReportBounceForm";
import { useInteractions } from "@/modules/interactions/ui/use-interaction-queries";
import { describeError } from "@/shared/api/error-copy";
import { PreviewSection } from "@/shared/ui/PreviewSection";

type InteractionsSectionProps = Readonly<{
  prospectId: string;
  /** When shown under a message: replies are tied to it, and it can be reported as bounced. */
  message?: Readonly<{ id: string; channel: InteractionChannel }>;
}>;

type Dialog = { kind: "interaction"; type: LoggableInteractionType } | { kind: "bounce" };

/** A prospect's timeline with the ways to add to it: log their reply, log a call or meeting, report a bounce. */
export function InteractionsSection({ prospectId, message }: InteractionsSectionProps) {
  const query = useInteractions(prospectId);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const channel = message?.channel ?? "email";

  return (
    <PreviewSection title="Conversation">
      <Stack sx={{ gap: 1.5 }}>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button onClick={() => setDialog({ kind: "interaction", type: "reply" })} startIcon={<ForumRounded />} variant="outlined">Log reply</Button>
          <Button onClick={() => setDialog({ kind: "interaction", type: "call" })} startIcon={<AddCommentRounded />}>Log activity</Button>
          {message ? <Button color="inherit" onClick={() => setDialog({ kind: "bounce" })} startIcon={<MailLockRounded />}>Report bounce</Button> : null}
        </Stack>
        {query.isPending ? <Skeleton aria-label="Loading conversation" height={56} variant="rounded" /> : null}
        {query.isError ? <Typography color="error" role="alert" variant="body2">{describeError(query.error, "conversation")}</Typography> : null}
        {query.data?.length === 0 ? <Typography color="text.secondary" variant="body2">Nothing logged after the first message yet.</Typography> : null}
        {query.data?.map((interaction) => <InteractionTimelineItem interaction={interaction} key={interaction.id} />)}
      </Stack>
      {dialog?.kind === "interaction" ? <LogInteractionForm initialChannel={channel} initialType={dialog.type} onClose={close} onSaved={close} prospectId={prospectId} {...(message ? { outreachMessageId: message.id } : {})} /> : null}
      {dialog?.kind === "bounce" && message ? <ReportBounceForm onClose={close} onSaved={close} outreachMessageId={message.id} /> : null}
    </PreviewSection>
  );
}
