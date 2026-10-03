import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OutreachMessageDetail } from "@/modules/outreach/domain/outreach.types";
import * as followUpsApi from "@/modules/followups/ui/followups-api";
import * as interactionsApi from "@/modules/interactions/ui/interactions-api";
import { OutreachPreviewPanel } from "@/modules/outreach/ui/OutreachPreviewPanel";
import * as outreachApi from "@/modules/outreach/ui/outreach-api";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/outreach/ui/outreach-api");
vi.mock("@/modules/interactions/ui/interactions-api");
vi.mock("@/modules/followups/ui/followups-api");

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const message: OutreachMessageDetail = {
  id: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91", channel: "email", subject: "Quick intro", preview: "Hi", body: "Hi Marta", sentAt: "2026-09-01T10:00:00.000Z", deliveryStatus: "sent", bounceStatus: "none",
  replyStatus: "none", prospectId, person: { id: "person-1", fullName: "Marta Chen" }, organization: { id: "org-1", name: "Bluewave" }, prospect: { id: prospectId, status: "contacted", routeName: "Agencies", moduleName: null }, campaign: null
};

describe("OutreachPreviewPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(outreachApi.fetchOutreachMessage).mockResolvedValue(message);
    vi.mocked(interactionsApi.fetchInteractions).mockResolvedValue([]);
    vi.mocked(followUpsApi.createFollowUp).mockResolvedValue({ followUpId: "f1", created: true, auditEventId: "a1" });
  });

  it("links to who it went to", async () => {
    renderWithApp(<OutreachPreviewPanel messageId={message.id} onClose={vi.fn()} />);

    expect(await screen.findByRole("link", { name: "Open person" })).toHaveAttribute("href", "/people?id=person-1");
    expect(screen.getByRole("link", { name: "Open company" })).toHaveAttribute("href", "/people?view=companies&id=org-1");
  });

  it("schedules a follow-up for the same prospect, remembering which message it came from", async () => {
    renderWithApp(<OutreachPreviewPanel messageId={message.id} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Schedule follow-up" }));

    expect(await screen.findByText("For Marta Chen")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Nudge if no reply" } });
    fireEvent.click(screen.getByRole("button", { name: "Add follow-up" }));

    await waitFor(() => expect(followUpsApi.createFollowUp).toHaveBeenCalledWith({ prospectId, reason: "Nudge if no reply", originOutreachMessageId: message.id }));
  });
});
