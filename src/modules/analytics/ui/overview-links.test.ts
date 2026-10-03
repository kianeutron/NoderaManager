import { describe, expect, it } from "vitest";
import { campaignHref, campaignsHref, followUpsHref, messageHref, routeHref, unansweredMessagesHref } from "@/modules/analytics/ui/overview-links";
import { outreachUrlCodec } from "@/modules/outreach/ui/outreach-url-state";
import { strategyUrlCodec } from "@/modules/campaigns/ui/strategy-url-state";

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const stateOf = (link: string) => new URLSearchParams(link.split("?")[1] ?? "");

describe("overview links", () => {
  it("open the record on the page that owns it, in the format that page reads", () => {
    expect(outreachUrlCodec.parse(stateOf(messageHref(id)))).toMatchObject({ view: "messages", selectedId: id });
    expect(outreachUrlCodec.parse(stateOf(followUpsHref(id)))).toMatchObject({ view: "followups", selectedId: id });
    expect(strategyUrlCodec.parse(stateOf(routeHref(id)))).toMatchObject({ view: "routes", selectedId: id });
    expect(strategyUrlCodec.parse(stateOf(campaignHref(id)))).toMatchObject({ view: "campaigns", selectedId: id });
  });

  it("go to the plain list when no record is named", () => {
    expect(followUpsHref()).toBe("/outreach?view=followups");
    expect(campaignsHref()).toBe("/routes?view=campaigns");
    expect(outreachUrlCodec.parse(stateOf(unansweredMessagesHref()))).toMatchObject({ view: "messages", replyStatus: "none" });
  });
});
