import type { InteractionChannel, InteractionDirection, Sentiment } from "@/modules/interactions/domain/interaction.types";
import type { loggableInteractionTypes } from "@/modules/interactions/domain/interaction.schema";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/shared/lib/format-date";
import { blankToUndefined } from "@/shared/ui/form/form-values";

export type LoggableInteractionType = (typeof loggableInteractionTypes)[number];

export type InteractionFormValues = Readonly<{
  type: LoggableInteractionType;
  /** Only asked for call, meeting and other: a reply is always received and a follow-up message always sent. */
  direction: InteractionDirection;
  channel: InteractionChannel;
  /** A `datetime-local` value (local time, to the minute). Empty means "now". */
  occurredAt: string;
  subject: string;
  body: string;
  /** "1" to "9", or empty when not classified. */
  responseDepth: string;
  sentiment: Sentiment | "";
}>;

export const emptyInteractionForm = (now: Date, type: LoggableInteractionType, channel: InteractionChannel): InteractionFormValues =>
  ({ type, direction: "inbound", channel, occurredAt: toDateTimeLocalValue(now), subject: "", body: "", responseDepth: "", sentiment: "" });

/** The types whose direction is fixed, so the form does not ask. */
export function fixedDirectionOf(type: LoggableInteractionType): InteractionDirection | null {
  if (type === "reply" || type === "auto_reply") return "inbound";
  return type === "follow_up_message" ? "outbound" : null;
}

export type InteractionContext = Readonly<{ prospectId: string; outreachMessageId: string | undefined; idempotencyKey: string }>;

/** Form values to command input. The depth only travels with something received, which is the only place the command accepts it. */
export function toLogInteractionInput(values: InteractionFormValues, { prospectId, outreachMessageId, idempotencyKey }: InteractionContext): Record<string, unknown> {
  const direction = fixedDirectionOf(values.type) ?? values.direction;
  const occurredAt = fromDateTimeLocalValue(values.occurredAt);
  const subject = blankToUndefined(values.subject);
  const body = blankToUndefined(values.body);
  return {
    prospectId, direction, channel: values.channel, type: values.type, idempotencyKey,
    ...(outreachMessageId ? { outreachMessageId } : {}),
    ...(occurredAt ? { occurredAt } : {}),
    ...(subject ? { subject } : {}),
    ...(body ? { body } : {}),
    ...(values.responseDepth && direction === "inbound" ? { responseDepth: Number(values.responseDepth) } : {}),
    ...(values.sentiment ? { sentiment: values.sentiment } : {})
  };
}
