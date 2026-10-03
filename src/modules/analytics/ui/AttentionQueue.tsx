"use client";

import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import { Box, Button, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type { Overview } from "@/modules/analytics/domain/analytics.types";
import { followUpsHref, messageHref, unansweredMessagesHref } from "@/modules/analytics/ui/overview-links";
import { daysSince, describeAge, recipientName } from "@/modules/analytics/ui/overview-presentation";
import { describeDue } from "@/modules/followups/ui/followup-presentation";
import { channelLabel } from "@/modules/outreach/ui/outreach-presentation";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { SectionPanel } from "@/shared/ui/SectionPanel";

type AttentionQueueProps = Readonly<{ followUps: Overview["followUps"]; awaitingReply: Overview["awaitingReply"]; now: Date }>;

/** What to do next, oldest first: follow-ups past their date, then messages nobody has answered. Each opens where you act on it. */
export function AttentionQueue({ followUps, awaitingReply, now }: AttentionQueueProps) {
  const hiddenFollowUps = followUps.summary.overdue - followUps.overdue.length;
  const hiddenMessages = awaitingReply.total - awaitingReply.items.length;
  const clear = followUps.overdue.length === 0 && awaitingReply.items.length === 0;

  return (
    <SectionPanel description="Oldest first. Click to act." title="Needs you">
      {clear ? (
        <Stack sx={{ alignItems: "center", gap: 1, py: 3, textAlign: "center" }}>
          <CheckCircleRounded color="success" fontSize="large" />
          <Typography sx={{ fontWeight: 700 }}>You&rsquo;re clear</Typography>
          <Typography color="text.secondary" variant="body2">No follow-up is overdue and no message has waited more than 3 days without an answer.</Typography>
        </Stack>
      ) : (
        <Stack sx={{ gap: 2 }}>
          {followUps.overdue.length > 0 ? (
            <Group hidden={hiddenFollowUps} label="Overdue follow-ups" moreHref={followUpsHref()}>
              {followUps.overdue.map((followUp) => {
                const recipient = recipientName(followUp.person?.fullName ?? null, followUp.organization?.name ?? null);
                return <Item href={followUpsHref(followUp.id)} key={followUp.id} name={recipient} primary={followUp.reason} trailing={describeDue(followUp.dueAt, now)} urgent />;
              })}
            </Group>
          ) : null}
          {awaitingReply.items.length > 0 ? (
            <Group hidden={hiddenMessages} label="Waiting on a reply" moreHref={unansweredMessagesHref()}>
              {awaitingReply.items.map((message) => {
                const recipient = recipientName(message.personName, message.organizationName);
                return <Item href={messageHref(message.messageId)} key={message.messageId} name={recipient} primary={`${channelLabel[message.channel]} message`} trailing={`Sent ${describeAge(daysSince(message.sentAt, now))}`} />;
              })}
            </Group>
          ) : null}
        </Stack>
      )}
    </SectionPanel>
  );
}

function Group({ label, hidden, moreHref, children }: Readonly<{ label: string; hidden: number; moreHref: string; children: React.ReactNode }>) {
  return (
    <Box component="section">
      <Typography color="text.secondary" sx={{ letterSpacing: "0.08em", textTransform: "uppercase" }} variant="overline">{label}</Typography>
      <List dense disablePadding>{children}</List>
      {hidden > 0 ? <Button component={Link} href={moreHref} size="small" sx={{ mt: 0.5 }}>{hidden} more</Button> : null}
    </Box>
  );
}

function Item({ href, name, primary, trailing, urgent = false }: Readonly<{ href: string; name: string; primary: string; trailing: string; urgent?: boolean }>) {
  return (
    <ListItemButton component={Link} href={href} sx={{ borderRadius: 2, gap: 1.25, px: 1 }}>
      <EntityAvatar name={name} size={32} />
      <ListItemText primary={name} secondary={primary} slotProps={{ primary: { noWrap: true, sx: { fontWeight: 700 } }, secondary: { noWrap: true } }} />
      <Typography color={urgent ? "error.main" : "text.secondary"} sx={{ flex: "0 0 auto", fontSize: 12 }}>{trailing}</Typography>
    </ListItemButton>
  );
}
