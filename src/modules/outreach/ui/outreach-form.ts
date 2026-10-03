import type { OutreachChannel, OutreachTarget } from "@/modules/outreach/domain/outreach.types";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/shared/lib/format-date";
import { blankToUndefined } from "@/shared/ui/form/form-values";

export type OutreachFormValues = Readonly<{
  target: OutreachTarget | null;
  /** One of the prospect's active campaigns, or empty for none. */
  campaignId: string;
  channel: OutreachChannel;
  /** A `datetime-local` value (local time, to the minute). Empty means "now". */
  sentAt: string;
  subject: string;
  body: string;
}>;

export const emptyOutreachForm = (now: Date): OutreachFormValues => ({ target: null, campaignId: "", channel: "email", sentAt: toDateTimeLocalValue(now), subject: "", body: "" });

/**
 * Form values to command input. `idempotencyKey` belongs to one opening of the form, so a double click or a retry after a
 * dropped connection returns the first message instead of logging a second one.
 */
export function toLogOutreachInput(values: OutreachFormValues, idempotencyKey: string): Record<string, unknown> {
  const sentAt = fromDateTimeLocalValue(values.sentAt);
  const subject = blankToUndefined(values.subject);
  return { prospectId: values.target?.prospectId, channel: values.channel, body: values.body, idempotencyKey, ...(values.campaignId ? { campaignId: values.campaignId } : {}), ...(sentAt ? { sentAt } : {}), ...(subject ? { subject } : {}) };
}
