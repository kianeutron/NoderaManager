import { z } from "zod";
import { documentCategorySchema } from "@/modules/library/domain/document.schema";
import { documentDescriptionSchema, documentTitleSchema } from "@/modules/library/domain/document-commands.schema";
import { tagListSchema } from "@/modules/library/domain/tag-name";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";
import { createBlobKey } from "@/modules/library/domain/text-content";
import type { VersionDraft } from "@/modules/library/data/document-commands.repository";
import { v7 as uuidv7 } from "uuid";

export const maxUploadBytes = 25 * 1024 * 1024;

const allowedFileTypes = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/markdown": [".md", ".markdown"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"]
} as const;

export const documentUploadMetadataSchema = z.strictObject({
  title: documentTitleSchema,
  description: documentDescriptionSchema.optional(),
  category: documentCategorySchema.default("other"),
  folderId: z.uuid().optional(),
  tags: tagListSchema.default([])
});
export type DocumentUploadMetadata = z.infer<typeof documentUploadMetadataSchema>;

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot).toLowerCase();
}

export function sanitizeOriginalFilename(filename: string): string {
  const normalized = filename.normalize("NFKC").replace(/[\\/\u0000-\u001f\u007f]/g, "").trim();
  if (!normalized || normalized.length > 255 || normalized === "." || normalized === "..") {
    throw new LibraryCommandError("unsupported", "Choose a valid filename", "filename_invalid");
  }
  return normalized;
}

function hasExpectedSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  return true;
}

export function buildUploadedVersionDraft({ documentId, filename, mimeType, bytes, createdBy }: Readonly<{ documentId: string; filename: string; mimeType: string; bytes: Uint8Array; createdBy: string }>): VersionDraft {
  const cleanFilename = sanitizeOriginalFilename(filename);
  const extensions = allowedFileTypes[mimeType as keyof typeof allowedFileTypes];
  const extension = extensionOf(cleanFilename);
  if (!extensions || !extensions.some((allowedExtension) => allowedExtension === extension)) throw new LibraryCommandError("unsupported", "That file type is not supported", "file_type_unsupported");
  if (bytes.byteLength === 0) throw new LibraryCommandError("limit_exceeded", "The file is empty", "file_empty");
  if (bytes.byteLength > maxUploadBytes) throw new LibraryCommandError("limit_exceeded", "Files must be 25 MB or smaller", "file_too_large");
  if (!hasExpectedSignature(mimeType, bytes)) throw new LibraryCommandError("unsupported", "The file contents do not match its declared type", "file_content_mismatch");

  const versionId = uuidv7();
  return {
    versionId,
    blobKey: createBlobKey(documentId, versionId),
    originalFilename: cleanFilename,
    mimeType,
    sizeBytes: bytes.byteLength,
    checksumSha256: "",
    extractedText: "",
    extractionStatus: "skipped",
    createdBy
  };
}

export async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
