import { describe, expect, it } from "vitest";
import { normalizeWebUrl } from "@/shared/lib/normalize-web-url";

describe("normalizeWebUrl", () => {
  it.each([
    ["http://www.Example.com/Portfolio/", "https://example.com/Portfolio"],
    ["https://example.com/a?utm_source=x&b=2&a=1#top", "https://example.com/a?a=1&b=2"],
    ["https://example.com", "https://example.com"]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeWebUrl(input)).toBe(expected);
  });

  it("treats the same page written two ways as equal", () => {
    expect(normalizeWebUrl("http://www.example.com/me/")).toBe(normalizeWebUrl("https://example.com/me"));
  });
});
