import { describe, expect, it, vi } from "vitest";
import { setPersonEmails } from "@/modules/people/application/set-person-emails.service";
import { setPersonEmailsInputSchema } from "@/modules/people/domain/person.schema";
import { createActor } from "@/test/factories/actors";

const personId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

function createDependencies(currentEmails: string[], owners: { personId: string; fullName: string; normalizedEmail: string }[] = []) {
  return {
    reads: {
      findPerson: vi.fn().mockResolvedValue({ id: personId, fullName: "Marta Chen" }),
      listEmails: vi.fn().mockResolvedValue(currentEmails.map((email, index) => ({ email, normalizedEmail: email.toLowerCase(), isPrimary: index === 0 }))),
      findEmailOwners: vi.fn().mockResolvedValue(owners)
    },
    commands: { replaceEmails: vi.fn().mockResolvedValue("audit-1") }
  };
}

const parse = (emails: string[]) => setPersonEmailsInputSchema.parse({ personId, emails });

describe("setPersonEmails", () => {
  it("replaces the set with the first email primary and audits counts only", async () => {
    const dependencies = createDependencies(["old@x.io"]);
    const result = await setPersonEmails(dependencies, createActor(), parse(["New@x.io", "second@x.io"]));

    expect(dependencies.commands.replaceEmails).toHaveBeenCalledWith(personId, [{ email: "New@x.io", normalizedEmail: "new@x.io", isPrimary: true }, { email: "second@x.io", normalizedEmail: "second@x.io", isPrimary: false }], expect.objectContaining({ action: "person.emails_set", metadata: { before: 1, after: 2 } }));
    expect(result).toEqual({ personId, emails: ["New@x.io", "second@x.io"], changed: true, auditEventId: "audit-1" });
  });

  it("is a no-op when the same addresses are already set in the same order", async () => {
    const dependencies = createDependencies(["a@x.io", "b@x.io"]);
    const result = await setPersonEmails(dependencies, createActor(), parse(["A@x.io", "b@x.io"]));

    expect(result).toMatchObject({ changed: false, auditEventId: null });
    expect(dependencies.commands.replaceEmails).not.toHaveBeenCalled();
  });

  it("changes the primary when the order changes", async () => {
    const dependencies = createDependencies(["a@x.io", "b@x.io"]);
    await setPersonEmails(dependencies, createActor(), parse(["b@x.io", "a@x.io"]));

    expect(dependencies.commands.replaceEmails).toHaveBeenCalled();
  });

  it("refuses an address that another person owns", async () => {
    const dependencies = createDependencies([], [{ personId: "other", fullName: "Julian Park", normalizedEmail: "j@x.io" }]);

    await expect(setPersonEmails(dependencies, createActor(), parse(["j@x.io"]))).rejects.toThrow('belongs to "Julian Park" (person other)');
    expect(dependencies.commands.replaceEmails).not.toHaveBeenCalled();
  });

  it("clears every email with an empty list and reports an unknown person", async () => {
    const dependencies = createDependencies(["a@x.io"]);
    await setPersonEmails(dependencies, createActor(), parse([]));
    expect(dependencies.commands.replaceEmails).toHaveBeenCalledWith(personId, [], expect.anything());

    dependencies.reads.findPerson.mockResolvedValue(null);
    await expect(setPersonEmails(dependencies, createActor(), parse(["a@x.io"]))).rejects.toMatchObject({ code: "not_found" });
  });
});
