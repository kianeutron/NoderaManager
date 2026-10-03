import { describe, expect, it } from "vitest";
import { z } from "zod";
import { combineResolvers } from "@/shared/ui/form/combine-resolvers";
import { commandResolver } from "@/shared/ui/form/command-resolver";

type Values = { name: string; note: string };
const nameOnly = commandResolver<Values>(z.object({ name: z.string().min(2, "Name too short") }), ({ name }) => ({ name }), ["name", "note"]);
const noteOnly = commandResolver<Values>(z.object({ note: z.string().min(2, "Note too short") }), ({ note }) => ({ note }), ["name", "note"]);
const nameAlso = commandResolver<Values>(z.object({ name: z.string().min(9, "Another name message") }), ({ name }) => ({ name }), ["name", "note"]);
const run = (resolver: ReturnType<typeof combineResolvers<Values>>, values: Values) => resolver(values, undefined, {} as never);

describe("combineResolvers", () => {
  it("passes when every resolver passes", async () => {
    expect(await run(combineResolvers(nameOnly, noteOnly), { name: "Ada", note: "ok" })).toEqual({ values: { name: "Ada", note: "ok" }, errors: {} });
  });

  it("merges the errors each one finds", async () => {
    const result = await run(combineResolvers(nameOnly, noteOnly), { name: "A", note: "x" });
    expect(result.values).toEqual({});
    expect(Object.keys(result.errors).sort()).toEqual(["name", "note"]);
  });

  it("keeps the first resolver's message when two complain about the same field", async () => {
    const result = await run(combineResolvers(nameOnly, nameAlso), { name: "A", note: "ok" });
    expect(result.errors).toMatchObject({ name: { message: "Name too short" } });
  });
});
