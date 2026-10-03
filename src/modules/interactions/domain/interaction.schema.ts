import { z } from "zod";
import { isoTimestampSchema, optionalTextSchema } from "@/shared/api/field-schemas";
import type { BounceStatus, InteractionType } from "@/modules/interactions/domain/interaction.types";
import { interactionDirectionValues, maxResponseDepth, outreachChannelValues, sentimentValues } from "@/shared/db/schema/crm-values";

const channelSchema = z.enum(outreachChannelValues);
const directionSchema = z.enum(interactionDirectionValues);
const clockSkewMilliseconds = 5 * 60 * 1000;
const notInTheFuture = (value: Date | undefined) => value === undefined || value.getTime() <= Date.now() + clockSkewMilliseconds;
const occurredAtSchema = isoTimestampSchema.optional().refine(notInTheFuture, "That cannot have happened in the future");

export const maxInteractionBodyLength = 20_000;

/** A bounce is reported with `logBounceInputSchema`, which also updates the message it is about. */
export const loggableInteractionTypes = ["reply", "auto_reply", "follow_up_message", "call", "meeting", "other"] as const satisfies readonly InteractionType[];

const interactionFields = z.strictObject({
  prospectId: z.uuid(),
  /** The message this answers or follows up on; it must belong to the same prospect. */
  outreachMessageId: z.uuid().optional(),
  direction: directionSchema,
  channel: channelSchema,
  type: z.enum(loggableInteractionTypes),
  occurredAt: occurredAtSchema,
  subject: optionalTextSchema(300).optional(),
  body: z.string().trim().min(1).max(maxInteractionBodyLength).optional(),
  /** How far the conversation got, 1 to 9 (docs/11-operations/00-status-taxonomy.md). Set on purpose, never guessed. */
  responseDepth: z.number().int().min(1).max(maxResponseDepth).optional(),
  sentiment: z.enum(sentimentValues).optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional()
});

/** Who says what and what must accompany it, so a form and a tool give the same answer. */
export const logInteractionInputSchema = interactionFields.superRefine((input, context) => {
  const inboundOnly = input.type === "reply" || input.type === "auto_reply";
  if (inboundOnly && input.direction !== "inbound") context.addIssue({ code: "custom", path: ["direction"], message: "A reply comes from them, not from you." });
  if (input.type === "follow_up_message" && input.direction !== "outbound") context.addIssue({ code: "custom", path: ["direction"], message: "A follow-up message is one you send." });
  if ((input.type === "reply" || input.type === "follow_up_message") && input.body === undefined) context.addIssue({ code: "custom", path: ["body"], message: "Add what was said." });
  if (input.responseDepth !== undefined && input.direction !== "inbound") context.addIssue({ code: "custom", path: ["responseDepth"], message: "Depth describes their response, so it applies to something they sent." });
});
export type LogInteractionInput = z.infer<typeof logInteractionInputSchema>;

/** Every bounce state except "none", which is what a message has before anything is reported. */
export const bounceKindValues = ["soft", "hard", "blocked"] as const satisfies readonly BounceStatus[];

/** Reports that a sent message bounced. Repeating the same report is a no-op. */
export const logBounceInputSchema = z.strictObject({
  outreachMessageId: z.uuid(),
  bounceStatus: z.enum(bounceKindValues),
  occurredAt: occurredAtSchema
});
export type LogBounceInput = z.infer<typeof logBounceInputSchema>;

/** How many of a prospect's most recent interactions a timeline shows by default. */
export const interactionTimelineLimit = 25;

export const listInteractionsQuerySchema = z.strictObject({ prospectId: z.uuid(), limit: z.coerce.number().int().min(1).max(50).default(interactionTimelineLimit) });
export type ListInteractionsQuery = z.infer<typeof listInteractionsQuerySchema>;
