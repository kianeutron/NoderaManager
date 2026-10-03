import { describe, expect, it, vi } from "vitest";
import { setPersonLinks } from "@/modules/people/application/set-person-links.service";
import { createActor } from "@/test/factories/actors";

const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createDependencies(links: readonly { type: string; url: string; label: string | null }[], person: Record<string, unknown> | null = { id: personId, fullName: "Marta Chen" }) {
  return { reads: { findPerson: vi.fn().mockResolvedValue(person), listLinks: vi.fn().mockResolvedValue(links) }, commands: { replaceLinks: vi.fn().mockResolvedValue("audit-1") } };
}

describe("setPersonLinks", () => {
  it("replaces the list with normalized URLs and audits counts only", async () => {
    const dependencies = createDependencies([]);
    const result = await setPersonLinks(dependencies, createActor(), { personId, links: [{ type: "portfolio", url: "http://www.marta.dev/work/", label: "Work" }] });

    expect(dependencies.commands.replaceLinks).toHaveBeenCalledWith(personId, [{ type: "portfolio", url: "http://www.marta.dev/work/", normalizedUrl: "https://marta.dev/work", label: "Work" }], expect.objectContaining({ action: "person.links_set", metadata: { before: 0, after: 1 } }));
    expect(result).toEqual({ personId, count: 1, changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when the same pages are set again, even written differently or in another order", async () => {
    const dependencies = createDependencies([{ type: "github", url: "https://github.com/marta", label: null }, { type: "website", url: "https://marta.dev", label: "Home" }]);
    const result = await setPersonLinks(dependencies, createActor(), { personId, links: [{ type: "website", url: "https://www.marta.dev/", label: "Home" }, { type: "github", url: "http://github.com/marta" }] });

    expect(result).toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.replaceLinks).not.toHaveBeenCalled();
  });

  it("treats a changed type or label as a change", async () => {
    const dependencies = createDependencies([{ type: "website", url: "https://marta.dev", label: null }]);
    expect(await setPersonLinks(dependencies, createActor(), { personId, links: [{ type: "portfolio", url: "https://marta.dev" }] })).toMatchObject({ changed: true });
  });

  it("clears with an empty list and reports an unknown person", async () => {
    const clearing = createDependencies([{ type: "website", url: "https://marta.dev", label: null }]);
    expect(await setPersonLinks(clearing, createActor(), { personId, links: [] })).toMatchObject({ count: 0, changed: true });
    await expect(setPersonLinks(createDependencies([], null), createActor(), { personId, links: [] })).rejects.toMatchObject({ code: "not_found" });
  });
});
