import { z } from "zod";

const folderNameSchema = z.string().transform((value) => value.trim().replace(/\s+/g, " ")).pipe(z.string().min(1).max(80));

export const createFolderInputSchema = z.strictObject({ name: folderNameSchema, parentId: z.uuid().optional() });
export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;

export const renameFolderInputSchema = z.strictObject({ folderId: z.uuid(), name: folderNameSchema });
export type RenameFolderInput = z.infer<typeof renameFolderInputSchema>;

export const archiveFolderInputSchema = z.strictObject({ folderId: z.uuid() });
export type ArchiveFolderInput = z.infer<typeof archiveFolderInputSchema>;
