import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { ArchiveAction } from "@/shared/ui/ArchiveAction";
import { renderWithTheme } from "@/test/render-with-theme";

const base = { name: "Marta Chen", noun: "person", pending: false, error: null } as const;

describe("ArchiveAction", () => {
  it("asks before archiving, and archives only on confirmation", async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithTheme(<ArchiveAction {...base} archived={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByText(/hidden from lists and searches/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" }).at(-1) as HTMLElement);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
    await waitFor(() => expect(screen.queryByText("Archive this person?")).toBeNull());
  });

  it("restores straight away, since restoring loses nothing", () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithTheme(<ArchiveAction {...base} archived onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open and explains a failure without raw text", async () => {
    renderWithTheme(<ArchiveAction {...base} archived={false} error={new ApiRequestError(500, { requestId: "req-9" })} onChange={vi.fn().mockRejectedValue(new Error("db down"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(screen.getByText(/Reference: req-9/)).toBeInTheDocument();
    expect(screen.queryByText(/db down/)).toBeNull();
  });
});
