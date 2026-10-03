// File access rules belong to Library (module-boundaries.md). Only types a browser can
// render safely are ever served inline; everything else is forced to download.
const inlineViewableMimeTypes: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown"
]);

const plainTextMimeTypes: ReadonlySet<string> = new Set(["text/plain", "text/markdown"]);

export type ContentDisposition = "inline" | "attachment";

export function isInlineViewable(mimeType: string): boolean {
  return inlineViewableMimeTypes.has(mimeType);
}

export function resolveContentDisposition(mimeType: string, requested: ContentDisposition): ContentDisposition {
  return requested === "inline" && isInlineViewable(mimeType) ? "inline" : "attachment";
}

/** Markdown is served as plain text so the browser never interprets it as markup. */
export function resolveServedContentType(mimeType: string): string {
  return plainTextMimeTypes.has(mimeType) ? "text/plain; charset=utf-8" : mimeType;
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function buildContentDisposition(disposition: ContentDisposition, filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]|["\\%]/g, "_");
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}
