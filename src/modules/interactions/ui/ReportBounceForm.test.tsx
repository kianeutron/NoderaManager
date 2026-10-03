import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportBounceForm } from "@/modules/interactions/ui/ReportBounceForm";
import * as api from "@/modules/interactions/ui/interactions-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/interactions/ui/interactions-api");

const outreachMessageId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";

function open() {
  const onSaved = vi.fn();
  renderWithApp(<ReportBounceForm onClose={vi.fn()} onSaved={onSaved} outreachMessageId={outreachMessageId} />);
  return { onSaved };
}

describe("ReportBounceForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.logBounce).mockResolvedValue({ outreachMessageId, bounceStatus: "soft", changed: true, auditEventId: "a1" });
  });

  it("reports the chosen kind of bounce for the message, hard by default", async () => {
    const { onSaved } = open();
    fireEvent.click(screen.getByRole("button", { name: "Report bounce" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.logBounce).toHaveBeenCalledWith({ outreachMessageId, bounceStatus: "hard" });
  });

  it("can report a soft bounce instead", async () => {
    open();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Kind of bounce" }));
    fireEvent.click(await screen.findByRole("option", { name: "Soft bounce" }));
    fireEvent.click(screen.getByRole("button", { name: "Report bounce" }));

    await waitFor(() => expect(api.logBounce).toHaveBeenCalledWith({ outreachMessageId, bounceStatus: "soft" }));
  });

  it("explains a failure without raw text", async () => {
    vi.mocked(api.logBounce).mockRejectedValue(new ApiRequestError(404, { code: "NOT_FOUND", reason: "outreach_message_not_found" }));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Report bounce" }));

    expect(await screen.findByText("That message no longer exists.")).toBeInTheDocument();
  });
});
