import { describe, expect, it } from "vitest";
import { createKeysetPagination, sliceKeysetPage } from "@/shared/api/keyset";

const pagination = createKeysetPagination(["updated", "name"] as const, { defaultLimit: 25 });
const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";

describe("keyset cursor", () => {
  const cursor = { sort: "name", key: "mårta – q3/report?", id } as const;

  it("round-trips, including unicode and URL-hostile characters, as a URL-safe token", () => {
    const encoded = pagination.encode(cursor);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pagination.decode(encoded)).toEqual(cursor);
  });

  it.each([
    ["not base64", "%%%"],
    ["valid base64 that is not JSON", btoa("hello")],
    ["JSON of the wrong shape", btoa(JSON.stringify({ sort: "name" }))],
    ["an unknown sort", btoa(JSON.stringify({ sort: "size", key: "x", id }))],
    ["a non-uuid id", btoa(JSON.stringify({ sort: "name", key: "x", id: "1; drop table people" }))],
    ["an empty string", ""]
  ])("rejects %s", (_name, encoded) => {
    expect(pagination.decode(encoded)).toBeNull();
  });
});

describe("keyset pagination contract", () => {
  it("applies defaults and bounds the page size", () => {
    expect(pagination.pageSize).toEqual({ default: 25, max: 50 });
    expect(pagination.limitSchema.parse(undefined)).toBe(25);
    expect(pagination.limitSchema.parse("10")).toBe(10);
    expect(pagination.limitSchema.safeParse("51").success).toBe(false);
    expect(pagination.limitSchema.safeParse("0").success).toBe(false);
  });

  it("only accepts declared sort orders", () => {
    expect(pagination.sortSchema.safeParse("updated").success).toBe(true);
    expect(pagination.sortSchema.safeParse("size").success).toBe(false);
  });

  it("rejects a cursor for another sort, and a malformed one, through the shared validator", () => {
    const issues: string[] = [];
    const context = { addIssue: (issue: { message?: string }) => issues.push(issue.message ?? "") } as unknown as Parameters<typeof pagination.validateCursor>[1];
    const forName = pagination.encode({ sort: "name", key: "x", id });

    pagination.validateCursor({ sort: "name", cursor: forName }, context);
    expect(issues).toEqual([]);
    pagination.validateCursor({ sort: "updated", cursor: forName }, context);
    pagination.validateCursor({ sort: "updated", cursor: "garbage" }, context);
    pagination.validateCursor({ sort: "updated" }, context);
    expect(issues).toEqual(["Cursor was issued for a different sort order", "Invalid cursor"]);
  });

  it("fails loudly when an unvalidated cursor reaches a service", () => {
    expect(pagination.requireCursor(undefined)).toBeUndefined();
    expect(() => pagination.requireCursor("garbage")).toThrow("boundary validation");
    expect(pagination.requireCursor(pagination.encode({ sort: "name", key: "x", id }))).toMatchObject({ sort: "name" });
  });
});

describe("sliceKeysetPage", () => {
  const rows = [1, 2, 3];

  it("returns the page and a cursor built from the last returned row when an extra row exists", () => {
    expect(sliceKeysetPage(rows, 2, (last) => `after-${last}`)).toEqual({ rows: [1, 2], nextCursor: "after-2" });
  });

  it("ends pagination when the extra row is absent", () => {
    expect(sliceKeysetPage([1, 2], 2, () => "unused")).toEqual({ rows: [1, 2], nextCursor: null });
    expect(sliceKeysetPage([], 2, () => "unused")).toEqual({ rows: [], nextCursor: null });
  });
});
