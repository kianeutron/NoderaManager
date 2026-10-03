import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotesSection } from "@/modules/notes/ui/NotesSection";
import * as api from "@/modules/notes/ui/notes-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/notes/ui/notes-api");

const targetId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const show = (notes = [{ id: "n1", body: "Met at the conference", createdAt: "2026-09-01T10:00:00.000Z" }]) => renderWithApp(<NotesSection invalidateKey={["people"]} notes={notes} targetId={targetId} targetType="person" />);
const write = (text: string) => {
  fireEvent.change(screen.getByLabelText("Add a note"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Add note" }));
};

describe("NotesSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.addNote).mockResolvedValue({ noteId: "n2", created: true, auditEventId: "a1" });
  });

  it("lists existing notes", () => {
    show();
    expect(screen.getByText("Met at the conference")).toBeInTheDocument();
  });

  it("adds a note about this record and clears the box", async () => {
    show();
    write("  Follow up in Q4 ");

    await waitFor(() => expect(api.addNote).toHaveBeenCalledWith({ body: "Follow up in Q4", targets: [{ targetType: "person", targetId }] }));
    await waitFor(() => expect(screen.getByLabelText("Add a note")).toHaveValue(""));
  });

  it("does not send an empty note", async () => {
    show();
    write("   ");

    expect(await screen.findByText("This is required.")).toBeInTheDocument();
    expect(api.addNote).not.toHaveBeenCalled();
  });

  it("keeps what was typed and explains a failure in plain words", async () => {
    vi.mocked(api.addNote).mockRejectedValue(new ApiRequestError(404, { code: "NOT_FOUND" }));
    show();
    write("Important");

    expect(await screen.findByText("That note no longer exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Add a note")).toHaveValue("Important");
  });
});
