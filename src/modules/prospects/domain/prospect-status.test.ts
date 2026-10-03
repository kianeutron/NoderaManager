import { describe, expect, it } from "vitest";
import { closedProspectStatuses, resolveStructuralReason } from "@/modules/prospects/domain/prospect-status";

describe("resolveStructuralReason", () => {
  it("requires a reason to disqualify", () => {
    expect(resolveStructuralReason("disqualified", "residency")).toBe("residency");
    expect(() => resolveStructuralReason("disqualified", undefined)).toThrow("needs a structuralReason");
  });

  it("clears the reason on every other status and rejects one supplied with them", () => {
    for (const status of ["researched", "ready", "contacted", "replied", "warm", "opportunity", "proposal", "won", "lost", "dormant"] as const) {
      expect(resolveStructuralReason(status, undefined), status).toBeNull();
      expect(() => resolveStructuralReason(status, "language"), status).toThrow("only to disqualified");
    }
  });

  it("lists the statuses a prospect has finished with", () => {
    expect(closedProspectStatuses).toEqual(["won", "lost", "disqualified"]);
  });
});
