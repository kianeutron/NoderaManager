import { describe, expect, it } from "vitest";
import { createTextDocumentInputSchema, linkDocumentInputSchema, setDocumentTagsInputSchema, updateDocumentInputSchema } from "@/modules/library/domain/document-commands.schema";
import { createFolderInputSchema } from "@/modules/library/domain/folder-commands.schema";

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("document command schemas", () => {
  it("fills defaults for a minimal document", () => {
    expect(createTextDocumentInputSchema.parse({ title: " Notes ", content: "hello" })).toEqual({ title: "Notes", category: "other", tags: [], format: "markdown", content: "hello" });
  });

  it("stores an empty description as null", () => {
    expect(createTextDocumentInputSchema.parse({ title: "Notes", content: "x", description: "  " }).description).toBeNull();
  });

  it("rejects unknown fields on every command", () => {
    expect(createTextDocumentInputSchema.safeParse({ title: "x", content: "y", createdBy: "someone" }).success).toBe(false);
    expect(setDocumentTagsInputSchema.safeParse({ documentId: id, tags: [], extra: 1 }).success).toBe(false);
    expect(createFolderInputSchema.safeParse({ name: "x", depth: 9 }).success).toBe(false);
  });

  it("requires an update to change something, while allowing null to clear", () => {
    expect(updateDocumentInputSchema.safeParse({ documentId: id }).success).toBe(false);
    expect(updateDocumentInputSchema.parse({ documentId: id, description: null, folderId: null })).toEqual({ documentId: id, description: null, folderId: null });
  });

  it("defaults a link's relation, accepts campaigns and rejects unknown target types", () => {
    expect(linkDocumentInputSchema.parse({ documentId: id, targetType: "person", targetId: id }).relation).toBe("reference");
    expect(linkDocumentInputSchema.safeParse({ documentId: id, targetType: "campaign", targetId: id }).success).toBe(true);
    expect(linkDocumentInputSchema.safeParse({ documentId: id, targetType: "invoice", targetId: id }).success).toBe(false);
  });

  it("normalizes folder names", () => {
    expect(createFolderInputSchema.parse({ name: "  Sales   Decks " }).name).toBe("Sales Decks");
    expect(createFolderInputSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
  });
});
