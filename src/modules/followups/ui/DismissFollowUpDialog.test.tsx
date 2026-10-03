import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DismissFollowUpDialog } from "@/modules/followups/ui/DismissFollowUpDialog";
import * as api from "@/modules/followups/ui/followups-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/followups/ui/followups-api");

describe("DismissFollowUpDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.dismissFollowUp).mockResolvedValue({ followUpId: "f1", status: "dismissed", changed: true, auditEventId: "a1" });
  });

  it("asks why, and will not dismiss without a reason", async () => {
    renderWithApp(<DismissFollowUpDialog followUpId="f1" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(await screen.findByText("This is required.")).toBeInTheDocument();
    expect(api.dismissFollowUp).not.toHaveBeenCalled();
  });

  it("dismisses with the trimmed reason and closes", async () => {
    const onClose = vi.fn();
    renderWithApp(<DismissFollowUpDialog followUpId="f1" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "  Went with another vendor " } });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.dismissFollowUp).toHaveBeenCalledWith("f1", "Went with another vendor");
  });

  it("explains a failure without raw text and stays open", async () => {
    vi.mocked(api.dismissFollowUp).mockRejectedValue(new ApiRequestError(500, { requestId: "req-5" }));
    renderWithApp(<DismissFollowUpDialog followUpId="f1" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "No longer relevant" } });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(await screen.findByText(/Reference: req-5/)).toBeInTheDocument();
    expect(screen.getByLabelText("Reason")).toHaveValue("No longer relevant");
  });
});
