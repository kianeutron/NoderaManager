import { describe, expect, it, vi } from "vitest";
import { addNote } from "@/modules/notes/application/add-note.service";
import { addNoteInputSchema } from "@/modules/notes/domain/note.schema";
import { createActor } from "@/test/factories/actors";

const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const organizationId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";

function createDependencies(overrides: { existing?: unknown; missing?: string } = {}) {
  return { notes: {
    targetExists: vi.fn(async (target: { targetType: string }) => target.targetType !== overrides.missing),
    findNoteWithBody: vi.fn().mockResolvedValue(overrides.existing ?? null),
    insertNote: vi.fn().mockResolvedValue("audit-1")
  } };
}

const input = addNoteInputSchema.parse({ body: "Met at the conference. Interested in Q4.", targets: [{ targetType: "person", targetId: personId }, { targetType: "organization", targetId: organizationId }] });

describe("addNote", () => {
  it("links one note to every target and keeps the text out of the audit trail", async () => {
    const dependencies = createDependencies();
    const result = await addNote(dependencies, createActor(), input);

    const draft = dependencies.notes.insertNote.mock.calls[0]?.[0];
    expect(draft).toMatchObject({ body: "Met at the conference. Interested in Q4.", targets: input.targets, audit: { action: "note.added", entityType: "note", actorType: "mcp" } });
    expect(JSON.stringify(draft.audit)).not.toContain("conference");
    expect(result).toEqual({ noteId: draft.noteId, created: true, auditEventId: "audit-1" });
  });

  it("is idempotent: identical text on the same first record returns the existing note", async () => {
    const dependencies = createDependencies({ existing: { id: "note-1" } });
    const result = await addNote(dependencies, createActor(), input);

    expect(result).toEqual({ noteId: "note-1", created: false, auditEventId: null });
    expect(dependencies.notes.findNoteWithBody).toHaveBeenCalledWith(input.body, input.targets[0]);
    expect(dependencies.notes.insertNote).not.toHaveBeenCalled();
  });

  it("names the kind of record that was not found and writes nothing", async () => {
    const dependencies = createDependencies({ missing: "organization" });

    await expect(addNote(dependencies, createActor(), input)).rejects.toThrow("The organization to attach the note to was not found");
    expect(dependencies.notes.insertNote).not.toHaveBeenCalled();
  });
});
