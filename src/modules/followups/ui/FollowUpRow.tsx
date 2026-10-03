import { Chip } from "@mui/material";
import type { FollowUpView } from "@/modules/followups/domain/followup.types";
import { describeDue, followUpChannelLabel, followUpStatusLabel, isOverdue } from "@/modules/followups/ui/followup-presentation";
import { formatDate } from "@/shared/lib/format-date";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { EntityRow } from "@/shared/ui/EntityRow";

type FollowUpRowProps = Readonly<{ followUp: FollowUpView; selected: boolean; onSelect: () => void; now: Date }>;

/** Who it is about, why, and how urgent. Only an active follow-up is urgent; a finished one shows how it ended. */
export function FollowUpRow({ followUp, selected, onSelect, now }: FollowUpRowProps) {
  const recipient = followUp.person?.fullName ?? followUp.organization?.name ?? "Unknown recipient";
  const isActive = followUp.status === "active";

  return (
    <EntityRow
      avatar={<EntityAvatar name={recipient} />}
      meta={(
        <>
          {isActive ? <Chip color={isOverdue(followUp.dueAt, now) ? "error" : "default"} label={describeDue(followUp.dueAt, now)} size="small" variant="outlined" /> : <Chip label={followUpStatusLabel[followUp.status]} size="small" variant="outlined" />}
          {followUp.suggestedChannel ? <Chip label={followUpChannelLabel[followUp.suggestedChannel]} size="small" variant="outlined" /> : null}
        </>
      )}
      onSelect={onSelect}
      selected={selected}
      subtitle={followUp.reason}
      title={followUp.person && followUp.organization ? `${recipient} · ${followUp.organization.name}` : recipient}
      trailing={isActive ? (followUp.dueAt ? formatDate(followUp.dueAt) : null) : formatDate(followUp.completedAt ?? followUp.createdAt)}
    />
  );
}
