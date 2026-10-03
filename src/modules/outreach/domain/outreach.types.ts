import type { KeysetPage } from "@/shared/api/keyset";
import type { bounceStatusValues, deliveryStatusValues, outreachChannelValues, prospectStatusValues, replyStatusValues } from "@/shared/db/schema/crm-values";

export type OutreachChannel = (typeof outreachChannelValues)[number];
export type DeliveryStatus = (typeof deliveryStatusValues)[number];
export type BounceStatus = (typeof bounceStatusValues)[number];
export type ReplyStatus = (typeof replyStatusValues)[number];
type ProspectStatus = (typeof prospectStatusValues)[number];

export type OutreachMessageSummary = Readonly<{
  id: string;
  channel: OutreachChannel;
  subject: string | null;
  /** The start of the body, for lists. The whole text is only in the detail. */
  preview: string;
  sentAt: string;
  deliveryStatus: DeliveryStatus;
  replyStatus: ReplyStatus;
  prospectId: string;
  person: Readonly<{ id: string; fullName: string }> | null;
  organization: Readonly<{ id: string; name: string }> | null;
}>;

export type OutreachMessagePage = KeysetPage<OutreachMessageSummary>;

export type OutreachMessageDetail = OutreachMessageSummary & Readonly<{
  body: string;
  bounceStatus: BounceStatus;
  prospect: Readonly<{ id: string; status: ProspectStatus; routeName: string; moduleName: string | null }>;
  campaign: Readonly<{ id: string; name: string }> | null;
}>;

export type OutreachSummary = Readonly<{ total: number; last7Days: number; delivered: number; replied: number }>;

/** A prospect a message can be logged against, with enough to recognise it in a picker. */
export type OutreachTarget = Readonly<{ prospectId: string; personName: string | null; organizationName: string | null; routeName: string; status: ProspectStatus }>;

type Audited = Readonly<{ auditEventId: string | null }>;

/** `created: false` means an identical earlier request was found and nothing was written. */
export type LogOutreachResult = Audited & Readonly<{ messageId: string; created: boolean; prospectStatus: ProspectStatus }>;
