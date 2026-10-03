import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogInteractionForm } from "@/modules/interactions/ui/LogInteractionForm";
import * as api from "@/modules/interactions/ui/interactions-api";
import type { LoggableInteractionType } from "@/modules/interactions/ui/interaction-form";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/interactions/ui/interactions-api");

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const outreachMessageId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";

function open(initialType: LoggableInteractionType = "reply") {
  const onSaved = vi.fn();
  renderWithApp(<LogInteractionForm initialChannel="email" initialType={initialType} onClose={vi.fn()} onSaved={onSaved} outreachMessageId={outreachMessageId} prospectId={prospectId} />);
  return { onSaved };
}

const choose = async (label: string, option: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
};

describe("LogInteractionForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.logInteraction).mockResolvedValue({ interactionId: "i1", created: true, auditEventId: "a1", prospectStatus: "replied", messageReplyStatus: "replied" });
  });

  it("asks for what was said when logging a reply, in plain words", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Add what was said.")).toBeInTheDocument();
    expect(api.logInteraction).not.toHaveBeenCalled();
  });

  it("logs their reply against the message, received, with the depth and sentiment chosen", async () => {
    const { onSaved } = open();
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "  Yes, let's talk  " } });
    await choose("Response depth", "4 · Asked for CV, rate or availability");
    await choose("Sentiment", "Positive");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.logInteraction).toHaveBeenCalledWith(expect.objectContaining({ prospectId, outreachMessageId, type: "reply", direction: "inbound", body: "Yes, let's talk", responseDepth: 4, sentiment: "positive", idempotencyKey: expect.any(String) }));
  });

  it("only asks who started it for a call, meeting or other, and hides the depth for something we started", async () => {
    open();
    expect(screen.queryByRole("combobox", { name: "Who started it" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Response depth" })).toBeInTheDocument();

    await choose("What happened", "Call");
    await choose("Who started it", "Sent");
    expect(screen.queryByRole("combobox", { name: "Response depth" })).toBeNull();
  });

  it("logs a call we made without needing any text", async () => {
    const { onSaved } = open("call");
    await choose("Who started it", "Sent");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.logInteraction).toHaveBeenCalledWith(expect.objectContaining({ type: "call", direction: "outbound" }));
  });

  it("refuses a time in the future before sending anything", async () => {
    open("call");
    fireEvent.change(screen.getByLabelText("When"), { target: { value: "2099-01-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("That cannot have happened in the future")).toBeInTheDocument();
    expect(api.logInteraction).not.toHaveBeenCalled();
  });

  it("keeps the same key when retrying after a failure, and explains it without raw text", async () => {
    vi.mocked(api.logInteraction).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    open();
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Yes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.logInteraction).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(api.logInteraction).mock.calls.map(([input]) => input.idempotencyKey);
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });

  it("explains a do-not-contact refusal in plain words and keeps what was typed", async () => {
    vi.mocked(api.logInteraction).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "person_do_not_contact" }));
    open("follow_up_message");
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Just checking in" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("This person is marked do not contact.")).toBeInTheDocument();
    expect(screen.getByLabelText("Details")).toHaveValue("Just checking in");
  });
});
