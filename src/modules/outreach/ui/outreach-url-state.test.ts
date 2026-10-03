import { describe, expect, it } from "vitest";
import { defaultOutreachState, hasActiveFilters, outreachUrlCodec } from "@/modules/outreach/ui/outreach-url-state";

const id = "0b0e6a0e-5b52-4b3b-9a53-3f1d5a1f3c11";
const parse = (query: string) => outreachUrlCodec.parse(new URLSearchParams(query));

describe("outreach url state", () => {
  it("parses an empty query to the defaults and serializes them to nothing", () => {
    expect(parse("")).toEqual(defaultOutreachState);
    expect(outreachUrlCodec.serialize(defaultOutreachState)).toBe("");
  });

  it("round-trips a full state, for either view", () => {
    const messages = { ...defaultOutreachState, q: "marta", channel: "linkedin", replyStatus: "replied", selectedId: id } as const;
    const followUps = { ...defaultOutreachState, view: "followups", followUpStatus: "completed", followUpDue: "overdue", selectedId: id } as const;
    expect(parse(outreachUrlCodec.serialize(messages))).toEqual(messages);
    expect(parse(outreachUrlCodec.serialize(followUps))).toEqual(followUps);
  });

  it("drops only the invalid parameters", () => {
    expect(parse("view=nope&channel=fax&reply=replied&id=nope&q=marta&status=open&due=tomorrow")).toEqual({ ...defaultOutreachState, q: "marta", replyStatus: "replied" });
  });

  it("counts filters per view, but never the open record", () => {
    expect(hasActiveFilters(defaultOutreachState)).toBe(false);
    expect(hasActiveFilters({ ...defaultOutreachState, selectedId: id })).toBe(false);
    expect(hasActiveFilters({ ...defaultOutreachState, channel: "email" })).toBe(true);
    expect(hasActiveFilters({ ...defaultOutreachState, view: "followups", channel: "email" })).toBe(false);
    expect(hasActiveFilters({ ...defaultOutreachState, view: "followups", followUpStatus: "dismissed" })).toBe(true);
    expect(hasActiveFilters({ ...defaultOutreachState, view: "followups", followUpDue: "later" })).toBe(true);
  });
});
