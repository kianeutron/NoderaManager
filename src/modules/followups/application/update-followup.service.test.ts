import { describe, expect, it, vi } from "vitest";
import { updateFollowUp } from "@/modules/followups/application/update-followup.service";
import { updateFollowUpInputSchema } from "@/modules/followups/domain/followup.schema";
import { createActor } from "@/test/factories/actors";

const followUpId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const current = { id: followUpId, prospectId: "p1", status: "active", reason: "Ask about budget", dueAt: new Date("2026-11-01T00:00:00Z"), notBeforeAt: null, suggestedChannel: null };

function createDependencies(found: Record<string, unknown> | null = current) {
  return { reads: { findFollowUp: vi.fn().mockResolvedValue(found) }, commands: { updateFollowUp: vi.fn().mockResolvedValue("audit-1") } };
}
const parse = (input: Record<string, unknown>) => updateFollowUpInputSchema.parse({ followUpId, ...input });

describe("updateFollowUp", () => {
  it("writes only what differs and audits the field names, not their values' text", async () => {
    const dependencies = createDependencies();
    const result = await updateFollowUp(dependencies, createActor(), parse({ reason: "Ask about budget", dueAt: "2026-12-01T00:00:00Z", suggestedChannel: "linkedin" }));

    expect(dependencies.commands.updateFollowUp).toHaveBeenCalledWith(followUpId, { dueAt: new Date("2026-12-01T00:00:00Z"), suggestedChannel: "linkedin" }, expect.objectContaining({ action: "follow_up.updated", metadata: expect.objectContaining({ changed: ["dueAt", "suggestedChannel"] }) }));
    expect(result).toEqual({ followUpId, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when nothing really changes, including the same instant written again", async () => {
    const dependencies = createDependencies();
    await expect(updateFollowUp(dependencies, createActor(), parse({ dueAt: "2026-11-01T00:00:00Z", reason: "Ask about budget" }))).resolves.toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.updateFollowUp).not.toHaveBeenCalled();
  });

  it("clears a date with null", async () => {
    const dependencies = createDependencies();
    await updateFollowUp(dependencies, createActor(), parse({ dueAt: null }));
    expect(dependencies.commands.updateFollowUp).toHaveBeenCalledWith(followUpId, { dueAt: null }, expect.anything());
  });

  it("checks date order against the stored date when only one is sent", async () => {
    const dependencies = createDependencies({ ...current, dueAt: new Date("2026-11-01T00:00:00Z") });
    await expect(updateFollowUp(dependencies, createActor(), parse({ notBeforeAt: "2026-12-01T00:00:00Z" }))).rejects.toMatchObject({ reason: "follow_up_dates_invalid" });
    expect(dependencies.commands.updateFollowUp).not.toHaveBeenCalled();
  });

  it("refuses a finished follow-up and reports an unknown one", async () => {
    await expect(updateFollowUp(createDependencies({ ...current, status: "completed" }), createActor(), parse({ reason: "New" }))).rejects.toMatchObject({ reason: "follow_up_finished" });
    await expect(updateFollowUp(createDependencies(null), createActor(), parse({ reason: "New" }))).rejects.toMatchObject({ code: "not_found" });
  });
});
