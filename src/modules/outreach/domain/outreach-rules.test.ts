import { describe, expect, it } from "vitest";
import { assertCanLogOutreach, statusAfterOutreach, type OutreachContact } from "@/modules/outreach/domain/outreach-rules";

const open: OutreachContact = {
  prospect: { status: "ready", archivedAt: null },
  person: { archivedAt: null, doNotContactAt: null },
  organization: { archivedAt: null }
};
const archived = new Date("2026-09-01T00:00:00Z");

describe("assertCanLogOutreach", () => {
  it("allows an open prospect with a live contact", () => {
    expect(() => assertCanLogOutreach(open)).not.toThrow();
    expect(() => assertCanLogOutreach({ ...open, person: null })).not.toThrow();
  });

  it("never overrides a do-not-contact person", () => {
    expect(() => assertCanLogOutreach({ ...open, person: { archivedAt: null, doNotContactAt: archived } })).toThrowError(expect.objectContaining({ code: "conflict", reason: "person_do_not_contact" }));
  });

  it.each(["won", "lost", "disqualified"] as const)("refuses a %s prospect", (status) => {
    expect(() => assertCanLogOutreach({ ...open, prospect: { status, archivedAt: null } })).toThrowError(expect.objectContaining({ reason: "prospect_closed" }));
  });

  it("treats an archived prospect as not found", () => {
    expect(() => assertCanLogOutreach({ ...open, prospect: { status: "ready", archivedAt: archived } })).toThrowError(expect.objectContaining({ code: "not_found" }));
  });

  it("refuses an archived person, or an archived organization when there is no person", () => {
    expect(() => assertCanLogOutreach({ ...open, person: { archivedAt: archived, doNotContactAt: null } })).toThrowError(expect.objectContaining({ reason: "contact_archived" }));
    expect(() => assertCanLogOutreach({ ...open, person: null, organization: { archivedAt: archived } })).toThrowError(expect.objectContaining({ reason: "contact_archived" }));
  });

  it("lets a live person through even when their organization is archived", () => {
    expect(() => assertCanLogOutreach({ ...open, organization: { archivedAt: archived } })).not.toThrow();
  });
});

describe("statusAfterOutreach", () => {
  it.each([["researched", "contacted"], ["ready", "contacted"], ["contacted", "contacted"], ["warm", "warm"], ["proposal", "proposal"], ["dormant", "dormant"]] as const)("%s -> %s", (before, after) => {
    expect(statusAfterOutreach(before)).toBe(after);
  });
});
