import { describe, expect, it } from "vitest";
import { bulkOutreachImportInputSchema } from "@/modules/outreach/domain/bulk-import.schema";

const routeId = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("bulk outreach import schema", () => {
  it("normalizes a bounded historical record", () => {
    const result = bulkOutreachImportInputSchema.parse({ records: [{
      recordKey: "thread-1",
      organization: { name: "Acme", domains: ["acme.io"] },
      person: { fullName: "Marta Chen", emails: ["marta@acme.io"] },
      routeId,
      messages: [{ key: "sent-1", channel: "email", body: "Hello", sentAt: "2026-09-01T10:00:00Z", external: { source: "gmail", messageId: "gmail-1" } }],
      interactions: [{ key: "reply-1", type: "reply", direction: "inbound", channel: "email", body: "Yes", occurredAt: "2026-09-02T10:00:00Z", answersMessageKey: "sent-1" }]
    }] });

    expect(result.records[0]?.messages[0]?.sentAt).toEqual(new Date("2026-09-01T10:00:00Z"));
    expect(result.records[0]?.interactions[0]?.body).toBe("Yes");
  });

  it("accepts the already-normalized dates passed by the MCP adapter", () => {
    const parsed = bulkOutreachImportInputSchema.parse({ records: [{
      recordKey: "thread-2",
      organization: { name: "Acme", domains: ["acme.io"] },
      person: { fullName: "Marta Chen", emails: ["marta@acme.io"] },
      routeId,
      messages: [{ key: "sent-1", channel: "email", body: "Hello", sentAt: "2026-09-01T10:00:00Z" }]
    }] });

    const reparsed = bulkOutreachImportInputSchema.parse(parsed);
    expect(reparsed.records[0]?.messages[0]?.sentAt).toEqual(new Date("2026-09-01T10:00:00Z"));
  });

  it("rejects duplicate record and message keys", () => {
    const result = bulkOutreachImportInputSchema.safeParse({ records: [
      { recordKey: "same", routeId, messages: [{ key: "same", channel: "email", body: "x", sentAt: "2026-09-01T10:00:00Z" }] },
      { recordKey: "same", routeId, messages: [{ key: "same", channel: "email", body: "x", sentAt: "2026-09-01T10:00:00Z" }] }
    ] });
    expect(result.success).toBe(false);
  });
});
