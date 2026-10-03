import { z } from "zod";
import { documentSortValues } from "@/modules/library/domain/document-sort";
import { createKeysetPagination } from "@/shared/api/keyset";
import { documentCategoryValues } from "@/shared/db/schema/library-values";

export const documentCategorySchema = z.enum(documentCategoryValues);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const documentPagination = createKeysetPagination(documentSortValues, { defaultLimit: 24 });

/** Filters shared by the URL, the HTTP API and the list service so they can never drift apart. */
export const libraryFiltersSchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  category: documentCategorySchema.optional(),
  tagId: z.uuid().optional(),
  folderId: z.uuid().optional(),
  sort: documentPagination.sortSchema.default("updated")
});
export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;

export const defaultLibraryFilters: LibraryFilters = libraryFiltersSchema.parse({});

export const documentPageSize = documentPagination.pageSize;

// The wire format of the cursor stays a string (that is what a query string carries); the list service decodes it.
export const documentListQuerySchema = libraryFiltersSchema.extend({
  limit: documentPagination.limitSchema,
  cursor: documentPagination.cursorSchema.optional()
}).superRefine(documentPagination.validateCursor);
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

export const documentIdParamSchema = z.object({ id: z.uuid() });

export const requestedDispositionValues = ["inline", "attachment"] as const;
export const documentFileQuerySchema = z.object({ disposition: z.enum(requestedDispositionValues).default("inline") });
