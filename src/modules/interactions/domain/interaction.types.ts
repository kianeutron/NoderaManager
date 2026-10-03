import type { bounceStatusValues, interactionDirectionValues, interactionTypeValues, outreachChannelValues, prospectStatusValues, replyStatusValues, sentimentValues } from "@/shared/db/schema/crm-values";

export type InteractionType = (typeof interactionTypeValues)[number];
export type InteractionDirection = (typeof interactionDirectionValues)[number];
export type InteractionChannel = (typeof outreachChannelValues)[number];
export type Sentiment = (typeof sentimentValues)[number];
export type BounceStatus = (typeof bounceStatusValues)[number];
type ReplyStatus = (typeof replyStatusValues)[number];
type ProspectStatus = (typeof prospectStatusValues)[number];

export type InteractionView = Readonly<{
  id: string;
  type: InteractionType;
  direction: InteractionDirection;
  channel: InteractionChannel;
  occurredAt: string;
  subject: string | null;
  body: string | null;
  /** 1 to 9, or null when it was never classified. */
  responseDepth: number | null;
  sentiment: Sentiment | null;
  outreachMessageId: string | null;
}>;

type Audited = Readonly<{ auditEventId: string | null }>;

/** `created: false` means an identical earlier request was found and nothing was written. */
export type LogInteractionResult = Audited & Readonly<{ interactionId: string; created: boolean; prospectStatus: ProspectStatus; messageReplyStatus: ReplyStatus | null }>;

/** `changed: false` means the message was already reported with this bounce. */
export type LogBounceResult = Audited & Readonly<{ outreachMessageId: string; bounceStatus: BounceStatus; changed: boolean }>;
