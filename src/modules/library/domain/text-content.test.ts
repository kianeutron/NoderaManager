import { describe, expect, it } from "vitest";
import { buildTextFilename, createBlobKey, maxTextContentBytes, sha256Hex, textContentSchema, textFormatForMimeType } from "@/modules/library/domain/text-content";

describe("text content", () => {
  it("hashes to the standard SHA-256 digest", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("rejects NUL characters because Postgres text cannot store them", () => {
    expect(textContentSchema.safeParse("a\u0000b").success).toBe(false);
  });

  it("limits content by bytes, not characters", () => {
    expect(textContentSchema.safeParse("a".repeat(maxTextContentBytes)).success).toBe(true);
    expect(textContentSchema.safeParse("a".repeat(maxTextContentBytes + 1)).success).toBe(false);
    expect(textContentSchema.safeParse("é".repeat(maxTextContentBytes / 2 + 1)).success).toBe(false);
  });

  it("builds a safe ASCII filename from the title", () => {
    expect(buildTextFilename("Q3 Research: Agency Landscape / 2026!", "markdown")).toBe("q3-research-agency-landscape-2026.md");
    expect(buildTextFilename("Mårta’s notes", "text")).toBe("martas-notes.txt");
    expect(buildTextFilename("../../etc/passwd", "text")).toBe("etc-passwd.txt");
    expect(buildTextFilename("日本語", "markdown")).toBe("document.md");
  });

  it("only treats markdown and plain text as writable text formats", () => {
    expect(textFormatForMimeType("text/markdown")).toBe("markdown");
    expect(textFormatForMimeType("text/plain")).toBe("text");
    expect(textFormatForMimeType("application/pdf")).toBeNull();
    expect(textFormatForMimeType("text/html")).toBeNull();
  });

  it("derives the blob key from server-generated ids only", () => {
    expect(createBlobKey("doc-1", "ver-1")).toBe("documents/doc-1/ver-1");
  });
});
