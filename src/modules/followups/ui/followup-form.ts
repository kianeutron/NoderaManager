import type { FollowUpChannel, FollowUpView } from "@/modules/followups/domain/followup.types";
import type { OutreachTarget } from "@/modules/outreach/domain/outreach.types";
import { fromDateTimeLocalValue, toDateTimeLocalValue } from "@/shared/lib/format-date";
import { blankToUndefined, definedEntries } from "@/shared/ui/form/form-values";

export type FollowUpFormValues = Readonly<{
  /** Chosen in the picker when adding; absent when the prospect is already known (from a message) or when editing. */
  target: OutreachTarget | null;
  reason: string;
  /** A `datetime-local` value (local time, to the minute). Empty means no date. */
  dueAt: string;
  notBeforeAt: string;
  /** Empty means no suggestion. */
  suggestedChannel: FollowUpChannel | "";
}>;

export const emptyFollowUpForm: FollowUpFormValues = { target: null, reason: "", dueAt: "", notBeforeAt: "", suggestedChannel: "" };

export function followUpToFormValues(followUp: FollowUpView): FollowUpFormValues {
  return {
    target: null,
    reason: followUp.reason,
    dueAt: followUp.dueAt ? toDateTimeLocalValue(new Date(followUp.dueAt)) : "",
    notBeforeAt: followUp.notBeforeAt ? toDateTimeLocalValue(new Date(followUp.notBeforeAt)) : "",
    suggestedChannel: followUp.suggestedChannel ?? ""
  };
}

/** A follow-up can be started from a message, which fixes the prospect and records where it came from. */
export type FollowUpOrigin = Readonly<{ prospectId: string; originOutreachMessageId?: string; originInteractionId?: string }>;

export function toCreateFollowUpInput(values: FollowUpFormValues, origin: FollowUpOrigin | undefined): Record<string, unknown> {
  return definedEntries({
    prospectId: origin?.prospectId ?? values.target?.prospectId,
    reason: blankToUndefined(values.reason),
    dueAt: fromDateTimeLocalValue(values.dueAt),
    notBeforeAt: fromDateTimeLocalValue(values.notBeforeAt),
    suggestedChannel: values.suggestedChannel || undefined,
    originOutreachMessageId: origin?.originOutreachMessageId,
    originInteractionId: origin?.originInteractionId
  });
}

/** Only what differs from the saved follow-up; `null` clears a date or the channel. Compared at the form's own precision (the minute). */
export function toFollowUpChanges(values: FollowUpFormValues, initial: FollowUpFormValues): Record<string, unknown> {
  return definedEntries({
    reason: values.reason.trim() === initial.reason ? undefined : values.reason,
    dueAt: values.dueAt === initial.dueAt ? undefined : fromDateTimeLocalValue(values.dueAt) ?? null,
    notBeforeAt: values.notBeforeAt === initial.notBeforeAt ? undefined : fromDateTimeLocalValue(values.notBeforeAt) ?? null,
    suggestedChannel: values.suggestedChannel === initial.suggestedChannel ? undefined : values.suggestedChannel || null
  });
}

/**
 * What the form validates on an edit: the changed fields, plus both dates in full, so the "not before" rule is checked
 * against what the person sees and not only against what they touched. (Save stays disabled until something changed.)
 */
export function toFollowUpEditValidationInput(values: FollowUpFormValues, initial: FollowUpFormValues): Record<string, unknown> {
  return { ...toFollowUpChanges(values, initial), dueAt: fromDateTimeLocalValue(values.dueAt) ?? null, notBeforeAt: fromDateTimeLocalValue(values.notBeforeAt) ?? null };
}

/** "Tomorrow", "in a week": a due date at 9 in the morning, local time, that many days ahead. */
export function dueAtInDays(days: number, now: Date): string {
  const morning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 9, 0);
  return toDateTimeLocalValue(morning);
}

