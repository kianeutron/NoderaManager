import { describe, expect, it, vi } from "vitest";
import { createBulkOutreachImportService } from "@/modules/outreach/application/bulk-outreach-import.service";
import { bulkOutreachImportInputSchema } from "@/modules/outreach/domain/bulk-import.schema";
import { createActor } from "@/test/factories/actors";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const moduleId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d91";
const unrelatedProspect = "01a10bca-a5e7-72ae-a8a8-5a8e1619a5f3";

function input() {
  return bulkOutreachImportInputSchema.parse({ records: [{
    recordKey: "ai-labs-thread",
    organization: { name: "AI Labs Malaysia", domains: ["ailabs.my"] },
    person: { fullName: "General inbox / team contact", emails: ["info@ailabs.my"] },
    routeId,
    routeModuleId: moduleId,
    messages: [{ key: "sent-1", channel: "email", body: "Hello", sentAt: "2026-09-01T10:00:00Z" }]
  }] });
}

describe("bulk outreach import planning", () => {
  it("does not reuse a route-only prospect while the target identities are new", async () => {
    const services = {
      people: { getPerson: vi.fn(), findDuplicateCandidates: vi.fn().mockResolvedValue([]), createPerson: vi.fn() },
      organizations: { getOrganization: vi.fn(), findOrganizationsByDomains: vi.fn().mockResolvedValue([]), createOrganization: vi.fn() },
      prospects: { getProspect: vi.fn(), searchProspects: vi.fn().mockResolvedValue({ items: [{ id: unrelatedProspect }] }), createProspect: vi.fn() },
      campaigns: { getCampaign: vi.fn(), addCampaignProspects: vi.fn() },
      outreach: { logOutreach: vi.fn() },
      interactions: { logInteraction: vi.fn(), logBounce: vi.fn() },
      imports: { create: vi.fn(), findForActor: vi.fn(), findForActorByFingerprint: vi.fn().mockResolvedValue(null), updateResult: vi.fn() },
      externalRefs: { find: vi.fn(), link: vi.fn() }
    } satisfies Parameters<typeof createBulkOutreachImportService>[0];

    const result = await createBulkOutreachImportService(services).preview(createActor(), input());
    expect(result.importId).toEqual(expect.any(String));
    expect(services.imports.create).toHaveBeenCalledWith(expect.objectContaining({
      plan: expect.objectContaining({ records: [expect.objectContaining({ prospectId: null, prospectAction: "create" })] })
    }));
    expect(services.prospects.searchProspects).not.toHaveBeenCalled();
  });
});
