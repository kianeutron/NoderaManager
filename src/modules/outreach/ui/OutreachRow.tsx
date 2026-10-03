import { Chip } from "@mui/material";
import type { OutreachMessageSummary } from "@/modules/outreach/domain/outreach.types";
import { channelLabel, deliveryLabel, replyLabel } from "@/modules/outreach/ui/outreach-presentation";
import { formatDate } from "@/shared/lib/format-date";
import { EntityAvatar } from "@/shared/ui/EntityAvatar";
import { EntityRow } from "@/shared/ui/EntityRow";

type OutreachRowProps = Readonly<{ message: OutreachMessageSummary; selected: boolean; onSelect: () => void }>;

/** Who it went to, the subject (or the start of the text), and how it went. Delivery is only called out when it failed. */
export function OutreachRow({ message, selected, onSelect }: OutreachRowProps) {
  const recipient = message.person?.fullName ?? message.organization?.name ?? "Unknown recipient";

  return (
    <EntityRow
      avatar={<EntityAvatar name={recipient} />}
      meta={(
        <>
          <Chip label={channelLabel[message.channel]} size="small" variant="outlined" />
          {message.replyStatus === "none" ? null : <Chip color="success" label={replyLabel[message.replyStatus]} size="small" variant="outlined" />}
          {message.deliveryStatus === "failed" ? <Chip color="error" label={deliveryLabel.failed} size="small" variant="outlined" /> : null}
        </>
      )}
      onSelect={onSelect}
      selected={selected}
      subtitle={message.subject ?? message.preview}
      title={message.person && message.organization ? `${recipient} · ${message.organization.name}` : recipient}
      trailing={formatDate(message.sentAt)}
    />
  );
}
