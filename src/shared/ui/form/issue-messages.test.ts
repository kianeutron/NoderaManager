import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeIssue } from "@/shared/ui/form/issue-messages";

const messages = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input, { error: describeIssue });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("describeIssue", () => {
  it("replaces Zod's stock English with plain language", () => {
    expect(messages(z.string().min(1), "")).toEqual(["This is required."]);
    expect(messages(z.string().min(3), "ab")).toEqual(["Use at least 3 characters."]);
    expect(messages(z.string().max(2), "abc")).toEqual(["Use at most 2 characters."]);
    expect(messages(z.email(), "x")).toEqual(["Enter a valid email address."]);
    expect(messages(z.url(), "x")).toEqual(["Enter a valid web address, starting with https://"]);
    expect(messages(z.enum(["a", "b"]), "c")).toEqual(["Choose one of the available options."]);
    expect(messages(z.string(), undefined)).toEqual(["This is required."]);
    expect(messages(z.array(z.string()).min(1), [])).toEqual(["Add at least one."]);
  });

  it("names the offending value in a list", () => {
    expect(messages(z.array(z.email()), ["ok@example.com", "nope"])).toEqual(['"nope" isn\'t a valid email address.']);
  });

  it("keeps a message the schema author wrote", () => {
    expect(messages(z.string().min(1, "Use a linkedin.com URL"), "")).toEqual(["Use a linkedin.com URL"]);
    expect(messages(z.string().regex(/^[a-z]$/, "Use one letter"), "1")).toEqual(["Use one letter"]);
  });
});
