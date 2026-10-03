import { describe, expect, it } from "vitest";
import { assertCanLogInteraction, replyStatusAfter, statusAfterInteraction } from "@/modules/interactions/domain/interaction-rules";
import type { OutreachContact } from "@/modules/outreach/domain/outreach-rules";

const open: OutreachContact = { prospect: { status: "contacted", archivedAt: null }, person: { archivedAt: null, doNotContactAt: null }, organization: { archivedAt: null } };
const flagged: OutreachContact = { ...open, person: { archivedAt: null, doNotContactAt: new Date() } };
const closed: OutreachContact = { ...open, prospect: { status: "lost", archivedAt: null } };
const archivedProspect: OutreachContact = { ...open, prospect: { status: "contacted", archivedAt: new Date() } };

describe("assertCanLogInteraction", () => {
  it("applies the outreach rules to anything we send", () => {
    expect(() => assertCanLogInteraction(open, "outbound")).not.toThrow();
    expect(() => assertCanLogInteraction(flagged, "outbound")).toThrowError(expect.objectContaining({ reason: "person_do_not_contact" }));
    expect(() => assertCanLogInteraction(closed, "outbound")).toThrowError(expect.objectContaining({ reason: "prospect_closed" }));
  });

  it("always records something they sent, even from a flagged person or on a closed prospect", () => {
    expect(() => assertCanLogInteraction(flagged, "inbound")).not.toThrow();
    expect(() => assertCanLogInteraction(closed, "inbound")).not.toThrow();
  });

  it("cannot reach an archived prospect in either direction", () => {
    expect(() => assertCanLogInteraction(archivedProspect, "inbound")).toThrowError(expect.objectContaining({ code: "not_found" }));
    expect(() => assertCanLogInteraction(archivedProspect, "outbound")).toThrowError(expect.objectContaining({ code: "not_found" }));
  });
});

describe("statusAfterInteraction", () => {
  it.each([["researched", "replied"], ["ready", "replied"], ["contacted", "replied"], ["replied", "replied"], ["warm", "warm"], ["proposal", "proposal"], ["dormant", "dormant"]] as const)("a reply moves %s to %s", (before, after) => {
    expect(statusAfterInteraction(before, "reply", "inbound")).toBe(after);
  });

  it("does not move a prospect for an auto-reply, a call or a meeting they started", () => {
    for (const type of ["auto_reply", "call", "meeting", "other"] as const) expect(statusAfterInteraction("contacted", type, "inbound")).toBe("contacted");
  });

  it("treats anything we send like first contact", () => {
    expect(statusAfterInteraction("ready", "follow_up_message", "outbound")).toBe("contacted");
    expect(statusAfterInteraction("warm", "call", "outbound")).toBe("warm");
  });
});

describe("replyStatusAfter", () => {
  it.each([["reply", "none", "replied"], ["reply", "auto_reply", "replied"], ["reply", "replied", null], ["auto_reply", "none", "auto_reply"], ["auto_reply", "auto_reply", null], ["auto_reply", "replied", null], ["call", "none", null], ["follow_up_message", "none", null]] as const)("%s on a message that is %s -> %s", (type, current, expected) => {
    expect(replyStatusAfter(type, current)).toBe(expected);
  });
});
