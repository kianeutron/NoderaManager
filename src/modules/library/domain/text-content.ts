import { z } from "zod";

export const textFormatValues = ["markdown", "text"] as const;
export type TextFormat = (typeof textFormatValues)[number];

export const maxTextContentBytes = 100_000;

const mimeTypeByFormat = { markdown: "text/markdown", text: "text/plain" } as const satisfies Record<TextFormat, string>;
const extensionByFormat = { markdown: "md", text: "txt" } as const satisfies Record<TextFormat, string>;

// Postgres text columns reject NUL, and the content is copied into the search index.
export const textContentSchema = z.string().min(1)
  .refine((content) => !content.includes("\u0000"), "Content must not contain NUL characters")
  .refine((content) => new TextEncoder().encode(content).byteLength <= maxTextContentBytes, `Content must be at most ${maxTextContentBytes} bytes`);

export function mimeTypeForFormat(format: TextFormat): string {
  return mimeTypeByFormat[format];
}

/** Only text versions can be written through the API; other types arrive through file upload. */
export function textFormatForMimeType(mimeType: string): TextFormat | null {
  return textFormatValues.find((format) => mimeTypeByFormat[format] === mimeType) ?? null;
}

export function buildTextFilename(title: string, format: TextFormat): string {
  const slug = title.normalize("NFKD").replace(/[^\x00-\x7F]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${slug || "document"}.${extensionByFormat[format]}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Server-generated so a client can never choose where bytes live. */
export function createBlobKey(documentId: string, versionId: string): string {
  return `documents/${documentId}/${versionId}`;
}
