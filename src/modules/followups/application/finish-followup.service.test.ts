import { describe, expect, it, vi } from "vitest";
import { completeFollowUp, dismissFollowUp } from "@/modules/followups/application/finish-followup.service";
import { createActor } from "@/test/factories/actors";

const followUpId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createDependencies(status: string | null) {
  return { reads: { findFollowUp: vi.fn().mockResolvedValue(status ? { id: followUpId, prospectId: "p1", status } : null) }, commands: { finishFollowUp: vi.fn().mockResolvedValue("audit-1") } };
}

describe("completeFollowUp", () => {
  it("completes an active follow-up and audits it", async () => {
    const dependencies = createDependencies("active");
    const result = await completeFollowUp(dependencies, createActor(), { followUpId });

    expect(dependencies.commands.finishFollowUp).toHaveBeenCalledWith(followUpId, { status: "completed", completedAt: expect.any(Date) }, expect.objectContaining({ action: "follow_up.completed" }));
    expect(result).toEqual({ followUpId, status: "completed", changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when already completed, refuses a dismissed one, and reports an unknown one", async () => {
    const done = createDependencies("completed");
    await expect(completeFollowUp(done, createActor(), { followUpId })).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(done.commands.finishFollowUp).not.toHaveBeenCalled();
    await expect(completeFollowUp(createDependencies("dismissed"), createActor(), { followUpId })).rejects.toMatchObject({ reason: "follow_up_finished" });
    await expect(completeFollowUp(createDependencies(null), createActor(), { followUpId })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("dismissFollowUp", () => {
  it("dismisses an active follow-up with the reason, keeping the reason out of the audit trail", async () => {
    const dependencies = createDependencies("active");
    await dismissFollowUp(dependencies, createActor(), { followUpId, reason: "Went with another vendor" });

    expect(dependencies.commands.finishFollowUp).toHaveBeenCalledWith(followUpId, { status: "dismissed", dismissedReason: "Went with another vendor" }, expect.objectContaining({ action: "follow_up.dismissed" }));
    expect(JSON.stringify(dependencies.commands.finishFollowUp.mock.calls[0]?.[2])).not.toContain("another vendor");
  });

  it("is a no-op when already dismissed and refuses a completed one", async () => {
    await expect(dismissFollowUp(createDependencies("dismissed"), createActor(), { followUpId, reason: "x" })).resolves.toMatchObject({ changed: false });
    await expect(dismissFollowUp(createDependencies("completed"), createActor(), { followUpId, reason: "x" })).rejects.toMatchObject({ reason: "follow_up_finished" });
  });
});
