import { describe, expect, it, vi } from "vitest";
import { findSimilarOrganizations } from "@/modules/organizations/application/find-similar-organizations.service";

describe("findSimilarOrganizations", () => {
  it("looks the name up in its normalized form", async () => {
    const reads = { findOrganizationsByNormalizedName: vi.fn().mockResolvedValue([{ organizationId: "o1", name: "Bluewave" }]) };

    expect(await findSimilarOrganizations(reads, { name: "  BLUEWAVE " })).toEqual([{ organizationId: "o1", name: "Bluewave" }]);
    expect(reads.findOrganizationsByNormalizedName).toHaveBeenCalledWith("bluewave");
  });
});
