import { z } from "zod";
import { createKeysetPagination } from "@/shared/api/keyset";
import { isoTimestampSchema, optionalTextSchema } from "@/shared/api/field-schemas";
import { outreachChannelValues, replyStatusValues } from "@/shared/db/schema/crm-values";

const channelSchema = z.enum(outreachChannelValues);

export const maxOutreachBodyLength = 20_000;
/** Clocks differ a little; anything further ahead than this is a typo, not a message that was sent. */
const clockSkewMilliseconds = 5 * 60 * 1000;

/**
 * Records a message that was already sent. The person, organization and route come from the prospect, never from the
 * caller, so a message cannot be filed under someone else. `idempotencyKey` makes a retry return the first result.
 */
export const logOutreachInputSchema = z.strictObject({
  prospectId: z.uuid(),
  /** The campaign this is part of, if any. The prospect must belong to it and it must be active. */
  campaignId: z.uuid().optional(),
  channel: channelSchema,
  subject: optionalTextSchema(300).optional(),
  body: z.string().trim().min(1).max(maxOutreachBodyLength),
  /** When it was sent; defaults to now. */
  sentAt: isoTimestampSchema.optional().refine((value) => value === undefined || value.getTime() <= Date.now() + clockSkewMilliseconds, "A message cannot be sent in the future"),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});
export type LogOutreachInput = z.infer<typeof logOutreachInputSchema>;

export const outreachSortValues = ["sent"] as const;
export type OutreachSort = (typeof outreachSortValues)[number];
export const outreachPagination = createKeysetPagination(outreachSortValues, { defaultLimit: 25 });

export const outreachSearchQuerySchema = z.strictObject({
  q: optionalTextSchema(120).optional(),
  channel: channelSchema.optional(),
  replyStatus: z.enum(replyStatusValues).optional(),
  prospectId: z.uuid().optional(),
  sort: outreachPagination.sortSchema.default("sent"),
  limit: outreachPagination.limitSchema,
  cursor: outreachPagination.cursorSchema.optional()
}).superRefine(outreachPagination.validateCursor);
export type OutreachSearchQuery = z.infer<typeof outreachSearchQuerySchema>;

export const outreachTargetQuerySchema = z.strictObject({ q: optionalTextSchema(120).optional() });
export type OutreachTargetQuery = z.infer<typeof outreachTargetQuerySchema>;

export const outreachMessageIdInputSchema = z.strictObject({ messageId: z.uuid() });
export type OutreachMessageIdInput = z.infer<typeof outreachMessageIdInputSchema>;
