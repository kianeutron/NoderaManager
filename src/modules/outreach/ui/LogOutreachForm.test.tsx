import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogOutreachForm } from "@/modules/outreach/ui/LogOutreachForm";
import * as campaignsApi from "@/modules/campaigns/ui/campaigns-api";
import * as api from "@/modules/outreach/ui/outreach-api";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { renderWithApp } from "@/test/render-with-app";

vi.mock("@/modules/outreach/ui/outreach-api");
vi.mock("@/modules/campaigns/ui/campaigns-api");

const prospectId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const target = { prospectId, personName: "Marta Chen", organizationName: "Bluewave", routeName: "Agencies", status: "ready" } as const;

function open() {
  const onSaved = vi.fn();
  renderWithApp(<LogOutreachForm onClose={vi.fn()} onSaved={onSaved} />);
  return { onSaved };
}

const pickProspect = async () => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Prospect" }));
  fireEvent.click(await screen.findByRole("option", { name: "Marta Chen · Bluewave — Agencies" }));
};

const chooseChannel = async (option: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Channel" }));
  fireEvent.click(await screen.findByRole("option", { name: option }));
};

describe("LogOutreachForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchOutreachTargets).mockResolvedValue([target]);
    vi.mocked(campaignsApi.fetchProspectCampaigns).mockResolvedValue([]);
    vi.mocked(api.logOutreach).mockResolvedValue({ messageId: "m1", created: true, auditEventId: "a1", prospectStatus: "contacted" });
  });

  it("needs a prospect and a message, in plain words, on the right fields", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));

    expect(await screen.findAllByText("This is required.")).toHaveLength(2);
    expect(api.logOutreach).not.toHaveBeenCalled();
  });

  it("logs the message against the chosen prospect and reports the new id", async () => {
    const { onSaved } = open();
    await pickProspect();
    await chooseChannel("LinkedIn");
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "  Hi Marta  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("m1"));
    expect(api.logOutreach).toHaveBeenCalledWith(expect.objectContaining({ prospectId, channel: "linkedin", body: "Hi Marta", sentAt: expect.any(Date), idempotencyKey: expect.any(String) }));
  });

  it("refuses a send time in the future before sending anything", async () => {
    open();
    await pickProspect();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText("Sent"), { target: { value: "2099-01-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));

    expect(await screen.findByText("A message cannot be sent in the future")).toBeInTheDocument();
    expect(api.logOutreach).not.toHaveBeenCalled();
  });

  it("keeps the same key when the owner retries after a failure", async () => {
    vi.mocked(api.logOutreach).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    open();
    await pickProspect();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));
    expect(await screen.findByText(/Could not reach the server/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));
    await waitFor(() => expect(api.logOutreach).toHaveBeenCalledTimes(2));
    const [first, second] = vi.mocked(api.logOutreach).mock.calls.map(([input]) => input.idempotencyKey);
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });

  it("explains a do-not-contact refusal in plain words and keeps the message", async () => {
    vi.mocked(api.logOutreach).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "person_do_not_contact" }));
    open();
    await pickProspect();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));

    expect(await screen.findByText("This person is marked do not contact.")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveValue("Hello");
  });

  it("never shows raw text for a server fault", async () => {
    vi.mocked(api.logOutreach).mockRejectedValue(new ApiRequestError(500, { requestId: "req-3" }));
    open();
    await pickProspect();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));

    expect(await screen.findByText(/Reference: req-3/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Request failed|INTERNAL/);
  });

  it("offers the prospect's active campaigns once a prospect is chosen, and files the message under the one picked", async () => {
    vi.mocked(campaignsApi.fetchProspectCampaigns).mockResolvedValue([{ id: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d95", name: "Q4 agencies" }] as never);
    const { onSaved } = open();
    expect(screen.queryByRole("combobox", { name: "Campaign" })).toBeNull();

    await pickProspect();
    fireEvent.mouseDown(await screen.findByRole("combobox", { name: "Campaign" }));
    fireEvent.click(await screen.findByRole("option", { name: "Q4 agencies" }));
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(campaignsApi.fetchProspectCampaigns).toHaveBeenCalledWith(prospectId);
    expect(api.logOutreach).toHaveBeenCalledWith(expect.objectContaining({ prospectId, campaignId: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d95" }));
  });

  it("explains a campaign that is no longer active in plain words", async () => {
    vi.mocked(campaignsApi.fetchProspectCampaigns).mockResolvedValue([{ id: "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d95", name: "Q4 agencies" }] as never);
    vi.mocked(api.logOutreach).mockRejectedValue(new ApiRequestError(409, { code: "CONFLICT", reason: "campaign_not_active" }));
    open();
    await pickProspect();
    fireEvent.mouseDown(await screen.findByRole("combobox", { name: "Campaign" }));
    fireEvent.click(await screen.findByRole("option", { name: "Q4 agencies" }));
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Save outreach" }));

    expect(await screen.findByText("That campaign isn't active, so outreach can't be logged under it.")).toBeInTheDocument();
  });
});
