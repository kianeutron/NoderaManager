import { describe, expect, it } from "vitest";
import { escapeLikePattern } from "@/shared/db/escape-like";

describe("escapeLikePattern", () => {
  it("escapes wildcards and the escape character so input matches literally", () => {
    expect(escapeLikePattern("100%_done\\")).toBe("100\\%\\_done\\\\");
  });

  it("leaves ordinary text unchanged", () => {
    expect(escapeLikePattern("Bluewave proposal")).toBe("Bluewave proposal");
  });
});
