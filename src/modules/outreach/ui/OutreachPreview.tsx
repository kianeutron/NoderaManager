import { Box, Chip, Stack, Typography } from "@mui/material";
import type { OutreachMessageDetail } from "@/modules/outreach/domain/outreach.types";
import { bounceLabel, channelLabel, deliveryLabel, replyLabel } from "@/modules/outreach/ui/outreach-presentation";
import { ProspectStatusChip } from "@/modules/prospects/ui/ProspectStatusChip";
import { formatDateTime } from "@/shared/lib/format-date";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { FactList, PreviewSection } from "@/shared/ui/PreviewSection";

export function OutreachPreview({ message }: Readonly<{ message: OutreachMessageDetail }>) {
  const recipient = message.person?.fullName ?? message.organization?.name ?? "Unknown recipient";
  const facts = [
    { term: "Channel", value: channelLabel[message.channel] },
    { term: "Sent", value: formatDateTime(message.sentAt) },
    { term: "Delivery", value: deliveryLabel[message.deliveryStatus] },
    message.bounceStatus === "none" ? null : { term: "Bounce", value: bounceLabel[message.bounceStatus] },
    { term: "Reply", value: replyLabel[message.replyStatus] }
  ].filter((fact) => fact !== null);

  return (
    <Stack sx={{ gap: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
        <EntityAvatar name={recipient} size={56} />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ overflowWrap: "anywhere" }} variant="h6">{recipient}</Typography>
          {message.person && message.organization ? <Typography color="text.secondary" variant="body2">{message.organization.name}</Typography> : null}
        </Box>
      </Stack>

      <PreviewSection title="Details"><FactList facts={facts} /></PreviewSection>

      <PreviewSection title="Prospect">
        <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <ProspectStatusChip status={message.prospect.status} />
          <Chip label={[message.prospect.routeName, message.prospect.moduleName].filter(Boolean).join(" · ")} size="small" variant="outlined" />
          {message.campaign ? <Chip color="primary" label={`Campaign: ${message.campaign.name}`} size="small" variant="outlined" /> : null}
        </Stack>
      </PreviewSection>

      {message.subject ? <PreviewSection title="Subject"><Typography sx={{ overflowWrap: "anywhere" }} variant="body2">{message.subject}</Typography></PreviewSection> : null}

      <PreviewSection title="Message"><Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{message.body}</Typography></PreviewSection>
    </Stack>
  );
}
