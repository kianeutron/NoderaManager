import type { OutreachMessageDetail, OutreachMessageSummary } from "@/modules/outreach/domain/outreach.types";
import type { OutreachRepository } from "@/modules/outreach/data/outreach.repository";

type SummaryRow = Awaited<ReturnType<OutreachRepository["searchMessages"]>>[number];
type DetailRow = NonNullable<Awaited<ReturnType<OutreachRepository["findMessage"]>>>;
type ContactColumns = Pick<SummaryRow, "personId" | "personName" | "organizationId" | "organizationName">;

function toContacts({ personId, personName, organizationId, organizationName }: ContactColumns) {
  return {
    person: personId && personName ? { id: personId, fullName: personName } : null,
    organization: organizationId && organizationName ? { id: organizationId, name: organizationName } : null
  };
}

export function toOutreachSummary(row: SummaryRow): OutreachMessageSummary {
  return { id: row.id, channel: row.channel, subject: row.subject, preview: row.preview, sentAt: row.sentAt.toISOString(), deliveryStatus: row.deliveryStatus, replyStatus: row.replyStatus, prospectId: row.prospectId, ...toContacts(row) };
}

export function toOutreachDetail(row: DetailRow): OutreachMessageDetail {
  return {
    id: row.id, channel: row.channel, subject: row.subject, preview: row.body.slice(0, 160), body: row.body, sentAt: row.sentAt.toISOString(), deliveryStatus: row.deliveryStatus,
    bounceStatus: row.bounceStatus, replyStatus: row.replyStatus, prospectId: row.prospectId, ...toContacts(row),
    prospect: { id: row.prospectId, status: row.prospectStatus, routeName: row.routeName, moduleName: row.moduleName },
    campaign: row.campaignId && row.campaignName ? { id: row.campaignId, name: row.campaignName } : null
  };
}
