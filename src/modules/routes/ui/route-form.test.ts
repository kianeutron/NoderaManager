import { describe, expect, it } from "vitest";
import { createRouteInputSchema, moduleChangesSchema, routeChangesSchema, routeModuleBodySchema } from "@/modules/routes/domain/route.schema";
import { emptyRouteForm, toCreateModuleInput, toCreateRouteInput, toModuleChanges, toRouteChanges, type RouteFormValues } from "@/modules/routes/ui/route-form";

const saved: RouteFormValues = { name: "Agency Overflow", description: "Agencies with spare demand", sortOrder: "2" };

describe("route form mapping", () => {
  it("maps a name-only form to a valid route, leaving blanks out", () => {
    const input = toCreateRouteInput({ ...emptyRouteForm, name: "  Recruiters " });
    expect(input).toEqual({ name: "  Recruiters " });
    expect(createRouteInputSchema.parse(input)).toEqual({ name: "Recruiters", sortOrder: 0 });
  });

  it("sends the order as a number, and lets the schema refuse one that is not", () => {
    expect(toCreateRouteInput({ ...emptyRouteForm, name: "x", sortOrder: "3" })).toMatchObject({ sortOrder: 3 });
    expect(createRouteInputSchema.safeParse(toCreateRouteInput({ ...emptyRouteForm, name: "x", sortOrder: "abc" })).success).toBe(false);
    expect(createRouteInputSchema.safeParse(toCreateRouteInput({ ...emptyRouteForm, name: "x", sortOrder: "1.5" })).success).toBe(false);
  });

  it("sends nothing when nothing changed, and only what changed otherwise, with null to clear", () => {
    expect(toRouteChanges(saved, saved)).toEqual({});
    expect(toRouteChanges({ ...saved, description: "", sortOrder: "5" }, saved)).toEqual({ description: null, sortOrder: 5 });
    expect(routeChangesSchema.safeParse(toRouteChanges({ ...saved, name: "Recruiters" }, saved)).success).toBe(true);
  });
});

describe("module form mapping", () => {
  it("maps to a valid module and to only the changes", () => {
    expect(routeModuleBodySchema.safeParse(toCreateModuleInput({ name: "UX studios", description: "" })).success).toBe(true);
    expect(toCreateModuleInput({ name: "UX studios", description: "" })).toEqual({ name: "UX studios" });
    expect(toModuleChanges({ name: "UX", description: "" }, { name: "UX studios", description: "Design shops" })).toEqual({ name: "UX", description: null });
    expect(moduleChangesSchema.safeParse(toModuleChanges({ name: "UX studios", description: "" }, { name: "UX studios", description: "" })).success).toBe(false);
  });
});
