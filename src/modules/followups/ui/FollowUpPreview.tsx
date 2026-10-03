import { Box, Chip, Stack, Typography } from "@mui/material";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";
import { describeDue, followUpChannelLabel, followUpStatusLabel, isOverdue } from "@/modules/followups/ui/followup-presentation";
import { ProspectStatusChip } from "@/modules/prospects/ui/ProspectStatusChip";
import { formatDateTime } from "@/shared/lib/format-date";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { FactList, PreviewSection } from "@/shared/ui/PreviewSection";

type FollowUpPreviewProps = Readonly<{ followUp: FollowUpView; now: Date }>;

export function FollowUpPreview({ followUp, now }: FollowUpPreviewProps) {
  const recipient = followUp.person?.fullName ?? followUp.organization?.name ?? "Unknown recipient";
  const isActive = followUp.status === "active";
  const facts = [
    { term: "Status", value: followUpStatusLabel[followUp.status] },
    isActive ? { term: "Due", value: followUp.dueAt ? `${formatDateTime(followUp.dueAt)} (${describeDue(followUp.dueAt, now)})` : "No date" } : null,
    followUp.notBeforeAt ? { term: "Not before", value: formatDateTime(followUp.notBeforeAt) } : null,
    followUp.suggestedChannel ? { term: "Suggested channel", value: followUpChannelLabel[followUp.suggestedChannel] } : null,
    followUp.completedAt ? { term: "Completed", value: formatDateTime(followUp.completedAt) } : null,
    { term: "Added", value: formatDateTime(followUp.createdAt) }
  ].filter((fact) => fact !== null);

  return (
    <Stack sx={{ gap: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
        <EntityAvatar name={recipient} size={56} />
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ overflowWrap: "anywhere" }} variant="h6">{recipient}</Typography>
          {followUp.person && followUp.organization ? <Typography color="text.secondary" variant="body2">{followUp.organization.name}</Typography> : null}
        </Box>
        {isActive && isOverdue(followUp.dueAt, now) ? <Chip color="error" label="Overdue" size="small" sx={{ ml: "auto" }} /> : null}
      </Stack>

      <PreviewSection title="Reason"><Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{followUp.reason}</Typography></PreviewSection>

      <PreviewSection title="Details"><FactList facts={facts} /></PreviewSection>

      {followUp.dismissedReason ? <PreviewSection title="Why it was dismissed"><Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }} variant="body2">{followUp.dismissedReason}</Typography></PreviewSection> : null}

      <PreviewSection title="Prospect">
        <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <ProspectStatusChip status={followUp.prospect.status} />
          <Chip label={followUp.prospect.routeName} size="small" variant="outlined" />
        </Stack>
      </PreviewSection>
    </Stack>
  );
}
