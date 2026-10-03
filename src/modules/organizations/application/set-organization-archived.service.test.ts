import { describe, expect, it, vi } from "vitest";
import { archiveOrganization, restoreOrganization } from "@/modules/organizations/application/set-organization-archived.service";
import { createActor } from "@/test/factories/actors";

const organizationId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";

function createDependencies(organization: Record<string, unknown> | null) {
  return { reads: { findOrganizationIncludingArchived: vi.fn().mockResolvedValue(organization) }, commands: { setArchived: vi.fn().mockResolvedValue("audit-1") } };
}

const live = { id: organizationId, name: "Bluewave", archivedAt: null };
const archived = { ...live, archivedAt: new Date("2026-09-01T10:00:00Z") };

describe("archiveOrganization", () => {
  it("archives a live organization and audits it", async () => {
    const dependencies = createDependencies(live);
    const result = await archiveOrganization(dependencies, createActor(), { organizationId });

    expect(dependencies.commands.setArchived).toHaveBeenCalledWith(organizationId, expect.any(Date), expect.objectContaining({ action: "organization.archived" }));
    expect(result).toEqual({ organizationId, archived: true, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when already archived, and reports an unknown organization", async () => {
    const dependencies = createDependencies(archived);
    expect(await archiveOrganization(dependencies, createActor(), { organizationId })).toMatchObject({ changed: false });
    expect(dependencies.commands.setArchived).not.toHaveBeenCalled();
    await expect(archiveOrganization(createDependencies(null), createActor(), { organizationId })).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("restoreOrganization", () => {
  it("restores an archived organization, and is a no-op for a live one", async () => {
    const restoring = createDependencies(archived);
    expect(await restoreOrganization(restoring, createActor(), { organizationId })).toMatchObject({ archived: false, changed: true });
    expect(restoring.commands.setArchived).toHaveBeenCalledWith(organizationId, null, expect.objectContaining({ action: "organization.restored" }));

    const live2 = createDependencies(live);
    expect(await restoreOrganization(live2, createActor(), { organizationId })).toMatchObject({ changed: false, auditEventId: null });
  });
});
