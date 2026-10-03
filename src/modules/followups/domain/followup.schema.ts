import { z } from "zod";
import { createKeysetPagination } from "@/shared/api/keyset";
import { isoTimestampSchema, optionalTextSchema } from "@/shared/api/field-schemas";
import { followUpStatusValues, outreachChannelValues } from "@/shared/db/schema/crm-values";

const channelSchema = z.enum(outreachChannelValues);
const statusSchema = z.enum(followUpStatusValues);
const reasonSchema = z.string().trim().min(1).max(500);

const notBeforeIsNotAfterDue = (input: Readonly<{ dueAt?: Date | null | undefined; notBeforeAt?: Date | null | undefined }>) =>
  !input.dueAt || !input.notBeforeAt || input.notBeforeAt.getTime() <= input.dueAt.getTime();
const datesOutOfOrder = { path: ["notBeforeAt"], message: "The \"not before\" date cannot be after the due date." };

/**
 * A task to get back to a prospect: why, and when. `dueAt` is the deadline; `notBeforeAt` is the earliest sensible moment
 * (a warm lead who said "after the summer"). Both are optional, so a follow-up can be a note to self with no date yet.
 * Where it came from (a message or an interaction) is optional and must belong to the same prospect.
 */
export const createFollowUpInputSchema = z.strictObject({
  prospectId: z.uuid(),
  reason: reasonSchema,
  dueAt: isoTimestampSchema.optional(),
  notBeforeAt: isoTimestampSchema.optional(),
  suggestedChannel: channelSchema.optional(),
  originOutreachMessageId: z.uuid().optional(),
  originInteractionId: z.uuid().optional()
}).refine(notBeforeIsNotAfterDue, datesOutOfOrder);
export type CreateFollowUpInput = z.infer<typeof createFollowUpInputSchema>;

/** Omitted means unchanged; `null` clears a date or the suggested channel. */
export const followUpFieldsSchema = z.strictObject({
  reason: reasonSchema.optional(),
  dueAt: isoTimestampSchema.nullable().optional(),
  notBeforeAt: isoTimestampSchema.nullable().optional(),
  suggestedChannel: channelSchema.nullable().optional()
});
const hasChange = (input: Readonly<Record<string, unknown>>, ignoredKey?: string) => Object.entries(input).some(([key, value]) => key !== ignoredKey && value !== undefined);

/** The editable fields alone (the web API takes the id from the path). */
export const followUpChangesSchema = followUpFieldsSchema.refine((input) => hasChange(input), "Provide at least one field to change").refine(notBeforeIsNotAfterDue, datesOutOfOrder);
export type FollowUpChanges = z.infer<typeof followUpChangesSchema>;

export const updateFollowUpInputSchema = followUpFieldsSchema.extend({ followUpId: z.uuid() }).refine((input) => hasChange(input, "followUpId"), "Provide at least one field to change").refine(notBeforeIsNotAfterDue, datesOutOfOrder);
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpInputSchema>;

export const followUpIdInputSchema = z.strictObject({ followUpId: z.uuid() });
export type FollowUpIdInput = z.infer<typeof followUpIdInputSchema>;

/** Why a follow-up is being let go, kept with it. */
export const dismissReasonSchema = z.strictObject({ reason: optionalTextSchema(500) });
export const dismissFollowUpInputSchema = z.strictObject({ followUpId: z.uuid(), ...dismissReasonSchema.shape });
export type DismissFollowUpInput = z.infer<typeof dismissFollowUpInputSchema>;

export const followUpSortValues = ["due", "recent"] as const;
export type FollowUpSort = (typeof followUpSortValues)[number];
export const followUpPagination = createKeysetPagination(followUpSortValues, { defaultLimit: 25 });

/** Timezone-free buckets for active follow-ups, so "overdue" never depends on which day the server thinks it is. */
export const followUpDueValues = ["overdue", "next_7_days", "later", "no_date"] as const;

export const followUpSearchQuerySchema = z.strictObject({
  status: statusSchema.default("active"),
  due: z.enum(followUpDueValues).optional(),
  prospectId: z.uuid().optional(),
  sort: followUpPagination.sortSchema.default("due"),
  limit: followUpPagination.limitSchema,
  cursor: followUpPagination.cursorSchema.optional()
}).superRefine(followUpPagination.validateCursor);
export type FollowUpSearchQuery = z.infer<typeof followUpSearchQuerySchema>;
