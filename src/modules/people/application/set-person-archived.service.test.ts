import { describe, expect, it, vi } from "vitest";
import { archivePerson, restorePerson } from "@/modules/people/application/set-person-archived.service";
import { createActor } from "@/test/factories/actors";

const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createDependencies(person: Record<string, unknown> | null) {
  return { reads: { findPersonIncludingArchived: vi.fn().mockResolvedValue(person) }, commands: { setArchived: vi.fn().mockResolvedValue("audit-1") } };
}

const live = { id: personId, fullName: "Marta Chen", archivedAt: null };
const archived = { ...live, archivedAt: new Date("2026-09-01T10:00:00Z") };

describe("archivePerson", () => {
  it("archives a live person and audits it", async () => {
    const dependencies = createDependencies(live);
    const result = await archivePerson(dependencies, createActor(), { personId });

    expect(dependencies.commands.setArchived).toHaveBeenCalledWith(personId, expect.any(Date), expect.objectContaining({ action: "person.archived", entityId: personId }));
    expect(result).toEqual({ personId, archived: true, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op for someone already archived", async () => {
    const dependencies = createDependencies(archived);
    expect(await archivePerson(dependencies, createActor(), { personId })).toEqual({ personId, archived: true, changed: false, auditEventId: null });
    expect(dependencies.commands.setArchived).not.toHaveBeenCalled();
  });

  it("reports an unknown person", async () => {
    await expect(archivePerson(createDependencies(null), createActor(), { personId })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("restorePerson", () => {
  it("restores an archived person by clearing the date", async () => {
    const dependencies = createDependencies(archived);
    const result = await restorePerson(dependencies, createActor(), { personId });

    expect(dependencies.commands.setArchived).toHaveBeenCalledWith(personId, null, expect.objectContaining({ action: "person.restored" }));
    expect(result).toMatchObject({ archived: false, changed: true });
  });

  it("is a no-op for someone who is not archived", async () => {
    const dependencies = createDependencies(live);
    expect(await restorePerson(dependencies, createActor(), { personId })).toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.setArchived).not.toHaveBeenCalled();
  });
});
