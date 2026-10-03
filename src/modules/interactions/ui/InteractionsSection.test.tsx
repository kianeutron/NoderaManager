import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InteractionView } from "@/modules/interactions/domain/interaction.types";
import { InteractionsSection } from "@/modules/interactions/ui/InteractionsSection";
import * as api from "@/modules/interactions/ui/interactions-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/interactions/ui/interactions-api");

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const reply: InteractionView = { id: "i1", type: "reply", direction: "inbound", channel: "email", occurredAt: "2026-09-02T10:00:00.000Z", subject: null, body: "Sounds good, send times", responseDepth: 3, sentiment: "positive", outreachMessageId: "m1" };

describe("InteractionsSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchInteractions).mockResolvedValue([reply]);
  });

  it("shows the timeline with what was said, the depth and the sentiment", async () => {
    renderWithApp(<InteractionsSection prospectId={prospectId} />);

    expect(await screen.findByText("Sounds good, send times")).toBeInTheDocument();
    expect(screen.getByText("Reply")).toBeInTheDocument();
    expect(screen.getByText("3 · Qualification question")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
  });

  it("says so when nothing has been logged yet", async () => {
    vi.mocked(api.fetchInteractions).mockResolvedValue([]);
    renderWithApp(<InteractionsSection prospectId={prospectId} />);

    expect(await screen.findByText("Nothing logged after the first message yet.")).toBeInTheDocument();
  });

  it("explains a load failure in plain words", async () => {
    vi.mocked(api.fetchInteractions).mockRejectedValue(new ApiRequestError(404, { code: "NOT_FOUND" }));
    renderWithApp(<InteractionsSection prospectId={prospectId} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("That conversation no longer exists.");
  });

  it("offers a bounce report only when it sits under a message, and opens the right form", async () => {
    const { unmount } = renderWithApp(<InteractionsSection prospectId={prospectId} />);
    expect(screen.queryByRole("button", { name: "Report bounce" })).toBeNull();
    unmount();

    renderWithApp(<InteractionsSection message={{ id: "m1", channel: "email" }} prospectId={prospectId} />);
    fireEvent.click(screen.getByRole("button", { name: "Report bounce" }));
    expect(await screen.findByText("Report a bounce")).toBeInTheDocument();
  });

  it("opens the log form on a reply, or on a call for other activity", async () => {
    renderWithApp(<InteractionsSection message={{ id: "m1", channel: "linkedin" }} prospectId={prospectId} />);

    fireEvent.click(screen.getByRole("button", { name: "Log reply" }));
    expect(await screen.findByText("Log interaction")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "What happened" })).toHaveTextContent("Reply");
    expect(screen.getByRole("combobox", { name: "Channel" })).toHaveTextContent("LinkedIn");
  });
});
