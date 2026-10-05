import { z } from "zod";
import { createOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { emailSchema } from "@/modules/people/domain/person.schema";
import { loggableInteractionTypes, maxInteractionBodyLength } from "@/modules/interactions/domain/interaction.schema";
import { maxOutreachBodyLength } from "@/modules/outreach/domain/outreach.schema";
import { externalRefTypeValues, externalSourceValues, outreachChannelValues, sentimentValues } from "@/shared/db/schema/crm-values";
import { displayNameSchema, isoTimestampSchema, optionalTextSchema } from "@/shared/api/field-schemas";

const channelSchema = z.enum(outreachChannelValues);
const sourceSchema = z.enum(externalSourceValues);
const refTypeSchema = z.enum(externalRefTypeValues);

const organizationSchema = createOrganizationInputSchema.extend({}).strict();
const personSchema = z.strictObject({
  fullName: displayNameSchema(160),
  emails: z.array(emailSchema).max(10).default([]),
  linkedinUrl: z.url().optional(),
  role: optionalTextSchema(160).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional()
});

const externalIdentitySchema = z.strictObject({
  source: sourceSchema,
  messageId: z.string().trim().min(1).max(500).optional(),
  threadId: z.string().trim().min(1).max(500).optional(),
  interactionId: z.string().trim().min(1).max(500).optional()
}).refine((value) => value.messageId || value.threadId || value.interactionId, "Provide a provider message, thread, or interaction identifier.");

const messageSchema = z.strictObject({
  key: z.string().trim().min(1).max(160),
  channel: channelSchema,
  subject: optionalTextSchema(300).optional(),
  body: z.string().trim().min(1).max(maxOutreachBodyLength),
  sentAt: isoTimestampSchema,
  external: externalIdentitySchema.optional(),
  bounceStatus: z.enum(["soft", "hard", "blocked"]).optional()
});

const interactionSchema = z.strictObject({
  key: z.string().trim().min(1).max(160),
  type: z.enum(loggableInteractionTypes),
  direction: z.enum(["inbound", "outbound"]),
  channel: channelSchema,
  subject: optionalTextSchema(300).optional(),
  body: z.string().trim().min(1).max(maxInteractionBodyLength).optional(),
  occurredAt: isoTimestampSchema,
  responseDepth: z.number().int().min(1).max(9).optional(),
  sentiment: z.enum(sentimentValues).optional(),
  answersMessageKey: z.string().trim().min(1).max(160).optional(),
  external: externalIdentitySchema.optional()
}).superRefine((value, context) => {
  if (["reply", "auto_reply"].includes(value.type) && value.direction !== "inbound") context.addIssue({ code: "custom", path: ["direction"], message: "A reply must be inbound." });
  if (value.type === "follow_up_message" && value.direction !== "outbound") context.addIssue({ code: "custom", path: ["direction"], message: "A follow-up message must be outbound." });
  if (["reply", "follow_up_message"].includes(value.type) && !value.body) context.addIssue({ code: "custom", path: ["body"], message: "Add what was said." });
});

export const bulkOutreachRecordSchema = z.strictObject({
  recordKey: z.string().trim().min(1).max(160),
  organizationId: z.uuid().optional(),
  organization: organizationSchema.optional(),
  personId: z.uuid().optional(),
  person: personSchema.optional(),
  prospectId: z.uuid().optional(),
  routeId: z.uuid(),
  routeModuleId: z.uuid().optional(),
  campaignId: z.uuid().optional(),
  messages: z.array(messageSchema).min(1).max(100),
  interactions: z.array(interactionSchema).max(100).default([]),
  customExternalRefs: z.array(z.strictObject({ source: sourceSchema, refType: refTypeSchema, externalId: z.string().trim().min(1).max(500) })).max(20).default([])
}).superRefine((value, context) => {
  if (!value.prospectId && !value.personId && !value.person) context.addIssue({ code: "custom", path: ["person"], message: "Provide a prospectId, personId, or person identity." });
  if (!value.prospectId && !value.organizationId && !value.organization) context.addIssue({ code: "custom", path: ["organization"], message: "Provide a prospectId, organizationId, or organization identity." });
  const messageKeys = new Set<string>();
  for (const [index, message] of value.messages.entries()) {
    if (messageKeys.has(message.key)) context.addIssue({ code: "custom", path: ["messages", index, "key"], message: "Message keys must be unique within a record." });
    messageKeys.add(message.key);
  }
  const interactionKeys = new Set<string>();
  for (const [index, interaction] of value.interactions.entries()) {
    if (interactionKeys.has(interaction.key)) context.addIssue({ code: "custom", path: ["interactions", index, "key"], message: "Interaction keys must be unique within a record." });
    interactionKeys.add(interaction.key);
    if (interaction.answersMessageKey && !messageKeys.has(interaction.answersMessageKey)) context.addIssue({ code: "custom", path: ["interactions", index, "answersMessageKey"], message: "answersMessageKey must reference a message in this record." });
  }
});
export type BulkOutreachRecord = z.infer<typeof bulkOutreachRecordSchema>;

export const bulkOutreachImportInputSchema = z.strictObject({ records: z.array(bulkOutreachRecordSchema).min(1).max(50) }).superRefine((value, context) => {
  const keys = new Set<string>();
  value.records.forEach((record, index) => {
    if (keys.has(record.recordKey)) context.addIssue({ code: "custom", path: ["records", index, "recordKey"], message: "recordKey must be unique within the batch." });
    keys.add(record.recordKey);
  });
});
export type BulkOutreachImportInput = z.infer<typeof bulkOutreachImportInputSchema>;

export const commitBulkOutreachImportInputSchema = z.strictObject({ importId: z.uuid(), idempotencyKey: z.string().trim().min(8).max(200) });
export type CommitBulkOutreachImportInput = z.infer<typeof commitBulkOutreachImportInputSchema>;

export const bulkImportRefTypes = { message: "message_id", thread: "thread_id", interaction: "interaction_id" } as const;
