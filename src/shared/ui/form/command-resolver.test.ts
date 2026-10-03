import { describe, expect, it } from "vitest";
import { z } from "zod";
import { commandResolver } from "@/shared/ui/form/command-resolver";

const schema = z.strictObject({ name: z.string().min(2), emails: z.array(z.email()) }).refine((value) => value.name !== "root-rule", "Cross-field rule");
const resolve = (values: { name: string; emails: string[] }) => commandResolver(schema, (input: { name: string; emails: string[] }) => input, ["name", "emails"])(values, undefined, {} as never);

describe("commandResolver", () => {
  it("passes valid values through", async () => {
    expect(await resolve({ name: "Ada", emails: [] })).toEqual({ values: { name: "Ada", emails: [] }, errors: {} });
  });

  it("puts each issue on the field it names, first message wins", async () => {
    const result = await resolve({ name: "A", emails: ["nope", "worse"] });
    expect(result.values).toEqual({});
    expect(Object.keys(result.errors)).toEqual(["name", "emails"]);
  });

  it("sends issues without a field to root", async () => {
    const result = await resolve({ name: "root-rule", emails: [] });
    expect(result.errors).toHaveProperty("root.message", "Cross-field rule");
  });

  it("moves an issue to the form field that holds what the command calls something else", async () => {
    const renamed = commandResolver(schema, (input: { name: string; emails: string[] }) => input, ["label", "emails"], { name: "label" });
    const result = await renamed({ name: "A", emails: [] }, undefined, {} as never);

    expect(Object.keys(result.errors)).toEqual(["label"]);
  });
});
