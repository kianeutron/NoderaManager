import { z } from "zod";
import { documentCategorySchema } from "@/modules/library/domain/document.schema";
import { tagListSchema } from "@/modules/library/domain/tag-name";
import { textContentSchema, textFormatValues } from "@/modules/library/domain/text-content";
import { documentLinkRelationValues } from "@/shared/db/schema/library-values";

// Commands are strict: unknown fields are rejected rather than silently ignored.
const documentId = z.uuid();
export const documentTitleSchema = z.string().trim().min(1).max(200);
export const documentDescriptionSchema = z.string().trim().max(2000).transform((value) => value || null);

export const createTextDocumentInputSchema = z.strictObject({
  title: documentTitleSchema,
  description: documentDescriptionSchema.optional(),
  category: documentCategorySchema.default("other"),
  folderId: z.uuid().optional(),
  tags: tagListSchema.default([]),
  format: z.enum(textFormatValues).default("markdown"),
  content: textContentSchema
});
export type CreateTextDocumentInput = z.infer<typeof createTextDocumentInputSchema>;

export const addTextDocumentVersionInputSchema = z.strictObject({
  documentId,
  content: textContentSchema,
  changeNote: z.string().trim().min(1).max(500).optional()
});
export type AddTextDocumentVersionInput = z.infer<typeof addTextDocumentVersionInputSchema>;

/** `null` clears a description or moves a document out of its folder; an omitted field is left unchanged. */
export const updateDocumentInputSchema = z.strictObject({
  documentId,
  title: documentTitleSchema.optional(),
  description: documentDescriptionSchema.nullable().optional(),
  category: documentCategorySchema.optional(),
  folderId: z.uuid().nullable().optional()
}).refine((input) => [input.title, input.description, input.category, input.folderId].some((value) => value !== undefined), "Provide at least one field to change");
export type UpdateDocumentInput = z.infer<typeof updateDocumentInputSchema>;

export const setDocumentTagsInputSchema = z.strictObject({ documentId, tags: tagListSchema });
export type SetDocumentTagsInput = z.infer<typeof setDocumentTagsInputSchema>;

export const documentIdInputSchema = z.strictObject({ documentId });
export type DocumentIdInput = z.infer<typeof documentIdInputSchema>;

export const linkTargetTypeValues = ["person", "organization", "prospect", "route", "campaign"] as const;
export type LinkTargetType = (typeof linkTargetTypeValues)[number];

export const linkDocumentInputSchema = z.strictObject({
  documentId,
  targetType: z.enum(linkTargetTypeValues),
  targetId: z.uuid(),
  relation: z.enum(documentLinkRelationValues).default("reference"),
  versionId: z.uuid().optional()
});
export type LinkDocumentInput = z.infer<typeof linkDocumentInputSchema>;

export const unlinkDocumentInputSchema = z.strictObject({ linkId: z.uuid() });
export type UnlinkDocumentInput = z.infer<typeof unlinkDocumentInputSchema>;

export const documentTextInputSchema = z.strictObject({ documentId, maxCharacters: z.number().int().min(1).max(50_000).default(20_000) });
export type DocumentTextInput = z.infer<typeof documentTextInputSchema>;
