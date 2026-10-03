import { describe, expect, it } from "vitest";
import { addNoteInputSchema, maxNoteLength } from "@/modules/notes/domain/note.schema";

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const other = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";

describe("add note schema", () => {
  it("trims the text and drops repeated targets", () => {
    const input = addNoteInputSchema.parse({ body: "  Met at the conference  ", targets: [{ targetType: "person", targetId: id }, { targetType: "person", targetId: id }, { targetType: "organization", targetId: id }] });

    expect(input.body).toBe("Met at the conference");
    expect(input.targets).toEqual([{ targetType: "person", targetId: id }, { targetType: "organization", targetId: id }]);
  });

  it.each([
    [{ body: "x", targets: [] }],
    [{ body: "", targets: [{ targetType: "person", targetId: id }] }],
    [{ body: "x".repeat(maxNoteLength + 1), targets: [{ targetType: "person", targetId: id }] }],
    [{ body: "x", targets: [{ targetType: "route", targetId: id }] }],
    [{ body: "x", targets: Array.from({ length: 6 }, (_, index) => ({ targetType: "person", targetId: `0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d0${index}` })) }]
  ])("rejects %o", (input) => {
    expect(addNoteInputSchema.safeParse(input).success).toBe(false);
  });

  it("keeps different targets of different types even with the same id", () => {
    expect(addNoteInputSchema.parse({ body: "x", targets: [{ targetType: "person", targetId: other }, { targetType: "prospect", targetId: other }] }).targets).toHaveLength(2);
  });
});
