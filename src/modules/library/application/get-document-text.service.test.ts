import { describe, expect, it, vi } from "vitest";
import { getDocumentText } from "@/modules/library/application/get-document-text.service";

const documentId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const repositoryReturning = (row: { documentId: string; extractedText: string | null } | null) => ({ findCurrentText: vi.fn().mockResolvedValue(row) });

describe("getDocumentText", () => {
  it("returns the whole text when it fits", async () => {
    const result = await getDocumentText(repositoryReturning({ documentId, extractedText: "hello" }), { documentId, maxCharacters: 100 });

    expect(result).toEqual({ documentId, text: "hello", totalCharacters: 5, truncated: false });
  });

  it("truncates and says so", async () => {
    const result = await getDocumentText(repositoryReturning({ documentId, extractedText: "abcdefghij" }), { documentId, maxCharacters: 4 });

    expect(result).toEqual({ documentId, text: "abcd", totalCharacters: 10, truncated: true });
  });

  it("never leaves half of an emoji at the cut", async () => {
    const result = await getDocumentText(repositoryReturning({ documentId, extractedText: "ab😀cd" }), { documentId, maxCharacters: 3 });

    expect(result.text).toBe("ab");
    expect(result.truncated).toBe(true);
  });

  it("reports a document with no readable text", async () => {
    const result = await getDocumentText(repositoryReturning({ documentId, extractedText: null }), { documentId, maxCharacters: 100 });

    expect(result).toEqual({ documentId, text: null, totalCharacters: 0, truncated: false });
  });

  it("reports an unknown document", async () => {
    await expect(getDocumentText(repositoryReturning(null), { documentId, maxCharacters: 100 })).rejects.toMatchObject({ code: "not_found" });
  });
});
