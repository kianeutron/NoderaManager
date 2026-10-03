import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProspectStatusDialog } from "@/modules/prospects/ui/ProspectStatusDialog";
import * as followUpsApi from "@/modules/followups/ui/followups-api";
import * as api from "@/modules/prospects/ui/prospects-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/prospects/ui/prospects-api");
vi.mock("@/modules/followups/ui/followups-api");

const choose = (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: option }));
};

describe("ProspectStatusDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.updateProspectStatus).mockResolvedValue({ prospectId: "p1", status: "warm", previousStatus: "ready", changed: true, auditEventId: "a1" });
    vi.mocked(followUpsApi.createFollowUp).mockResolvedValue({ followUpId: "f1", created: true, auditEventId: "a2" });
  });

  it("cannot be saved until the status changes, then sends only the status", async () => {
    const onClose = vi.fn();
    renderWithApp(<ProspectStatusDialog onClose={onClose} prospectId="p1" status="ready" />);
    expect(screen.getByRole("button", { name: "Change status" })).toBeDisabled();

    choose("Status", "Warm");
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.updateProspectStatus).toHaveBeenCalledWith("p1", "warm", undefined);
  });

  it("asks for a reason to disqualify and will not send without one", async () => {
    renderWithApp(<ProspectStatusDialog onClose={vi.fn()} prospectId="p1" status="ready" />);
    choose("Status", "Disqualified");
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));

    expect(await screen.findByText("Choose why this prospect is disqualified.")).toBeInTheDocument();
    expect(api.updateProspectStatus).not.toHaveBeenCalled();

    choose("Reason", "Language");
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));
    await waitFor(() => expect(api.updateProspectStatus).toHaveBeenCalledWith("p1", "disqualified", "language"));
  });

  it("drops a chosen reason when the status moves away from disqualified", async () => {
    renderWithApp(<ProspectStatusDialog onClose={vi.fn()} prospectId="p1" status="ready" />);
    choose("Status", "Disqualified");
    choose("Reason", "Language");
    choose("Status", "Dormant");
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));

    await waitFor(() => expect(api.updateProspectStatus).toHaveBeenCalledWith("p1", "dormant", undefined));
  });

  describe("going dormant", () => {
    it("offers a follow-up date only for dormant, and creates it after the status change", async () => {
      const onClose = vi.fn();
      renderWithApp(<ProspectStatusDialog onClose={onClose} prospectId="0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90" status="contacted" />);
      expect(screen.queryByLabelText("Follow up on")).toBeNull();

      await choose("Status", "Dormant");
      fireEvent.change(screen.getByLabelText("Follow up on"), { target: { value: "2026-12-01T09:00" } });
      fireEvent.change(screen.getByLabelText("Reason for the follow-up"), { target: { value: "Revisit after the holidays" } });
      fireEvent.click(screen.getByRole("button", { name: "Change status" }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(api.updateProspectStatus).toHaveBeenCalledWith("0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90", "dormant", undefined);
      expect(followUpsApi.createFollowUp).toHaveBeenCalledWith({ prospectId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90", reason: "Revisit after the holidays", dueAt: new Date(2026, 11, 1, 9, 0) });
    });

    it("creates no follow-up when no date is chosen, and none when the status is not dormant", async () => {
      const onClose = vi.fn();
      renderWithApp(<ProspectStatusDialog onClose={onClose} prospectId="0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90" status="contacted" />);
      await choose("Status", "Dormant");
      fireEvent.click(screen.getByRole("button", { name: "Change status" }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(followUpsApi.createFollowUp).not.toHaveBeenCalled();
    });

    it("needs a reason when a date is given, in plain words, and sends nothing", async () => {
      renderWithApp(<ProspectStatusDialog onClose={vi.fn()} prospectId="0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90" status="contacted" />);
      await choose("Status", "Dormant");
      fireEvent.change(screen.getByLabelText("Follow up on"), { target: { value: "2026-12-01T09:00" } });
      fireEvent.change(screen.getByLabelText("Reason for the follow-up"), { target: { value: "  " } });
      fireEvent.click(screen.getByRole("button", { name: "Change status" }));

      expect(await screen.findByText("This is required.")).toBeInTheDocument();
      expect(api.updateProspectStatus).not.toHaveBeenCalled();
    });

    it("explains a failed follow-up in plain words, and the status change was already made", async () => {
      vi.mocked(followUpsApi.createFollowUp).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "prospect_closed" }));
      renderWithApp(<ProspectStatusDialog onClose={vi.fn()} prospectId="0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90" status="contacted" />);
      await choose("Status", "Dormant");
      fireEvent.change(screen.getByLabelText("Follow up on"), { target: { value: "2026-12-01T09:00" } });
      fireEvent.click(screen.getByRole("button", { name: "Change status" }));

      expect(await screen.findByText("This prospect is closed. Open a new prospect to contact them again.")).toBeInTheDocument();
      expect(api.updateProspectStatus).toHaveBeenCalledTimes(1);
    });
  });
});
