import { describe, expect, it } from "vitest";
import { ApplicationError } from "@/shared/errors/application-error";
import { classifyError, describeForLog } from "@/shared/errors/classify-error";

const databaseError = (code: string) => Object.assign(new Error("duplicate key value violates unique constraint \"people_email_key\" (a@b.co)"), { code });

describe("classifyError", () => {
  it("keeps application errors as they are", () => {
    const error = new ApplicationError("not_found", "Person not found");
    expect(classifyError(error)).toBe(error);
  });

  it.each([["23505", "already_exists"], ["23503", "invalid_reference"], ["23514", "rule_violated"]])("maps database code %s to a conflict (%s)", (code, reason) => {
    expect(classifyError(databaseError(code))).toMatchObject({ code: "conflict", reason });
  });

  it("finds the database code on a wrapped cause, as Drizzle reports it", () => {
    expect(classifyError(new Error("Failed query", { cause: databaseError("23505") }))).toMatchObject({ reason: "already_exists" });
  });

  it("never echoes the database's message into the mapped error", () => {
    expect(classifyError(databaseError("23505"))?.message).not.toMatch(/people_email_key|a@b\.co/);
  });

  it.each([["an unknown database code", databaseError("XX000")], ["a plain error", new Error("boom")], ["a non-error", "boom"]])("leaves %s unexpected", (_case, error) => {
    expect(classifyError(error)).toBeNull();
  });
});

describe("describeForLog", () => {
  it("logs the type and database code but not the message", () => {
    const logged = describeForLog(databaseError("XX000"));
    expect(logged).toEqual({ errorName: "Error", databaseCode: "XX000" });
    expect(JSON.stringify(logged)).not.toMatch(/a@b\.co/);
  });
});
