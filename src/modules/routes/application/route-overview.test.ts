import { describe, expect, it } from "vitest";
import { buildRouteOverview } from "@/modules/routes/application/route-overview";

const agency = { id: "r1", name: "Agency Overflow", description: null, sortOrder: 0, archivedAt: null };
const recruiters = { id: "r2", name: "Recruiters", description: "Agencies that place people", sortOrder: 1, archivedAt: null };
const ux = { id: "m1", routeId: "r1", name: "UX studios", description: null, archivedAt: null };
const dev = { id: "m2", routeId: "r1", name: "Dev shops", description: null, archivedAt: new Date("2026-09-01T00:00:00Z") };

describe("buildRouteOverview", () => {
  it("counts a route's own prospects and messages together with its modules'", () => {
    const [route] = buildRouteOverview([agency], [ux], {
      prospectRows: [{ routeId: "r1", routeModuleId: "m1", prospects: 4, openProspects: 3, won: 1 }, { routeId: "r1", routeModuleId: null, prospects: 2, openProspects: 2, won: 0 }],
      messageRows: [{ routeId: "r1", routeModuleId: "m1", messages: 10, replies: 3 }, { routeId: "r1", routeModuleId: null, messages: 5, replies: 1 }]
    });

    expect(route?.stats).toEqual({ prospects: 6, openProspects: 5, won: 1, messages: 15, replies: 4 });
    expect(route?.modules).toEqual([expect.objectContaining({ id: "m1", stats: { prospects: 4, openProspects: 3, won: 1, messages: 10, replies: 3 } })]);
  });

  it("shows zeros for a route or module nothing was filed under, and keeps other routes apart", () => {
    const overview = buildRouteOverview([agency, recruiters], [ux], { prospectRows: [{ routeId: "r1", routeModuleId: null, prospects: 1, openProspects: 1, won: 0 }], messageRows: [] });

    expect(overview[1]?.stats).toEqual({ prospects: 0, openProspects: 0, won: 0, messages: 0, replies: 0 });
    expect(overview[0]?.modules[0]?.stats.prospects).toBe(0);
    expect(overview[0]?.stats.prospects).toBe(1);
  });

  it("ignores messages that belong to no route, and keeps archived modules, marked", () => {
    const [route] = buildRouteOverview([agency], [ux, dev], { prospectRows: [], messageRows: [{ routeId: null, routeModuleId: null, messages: 9, replies: 9 }] });

    expect(route?.stats.messages).toBe(0);
    expect(route?.modules.map((routeModule) => routeModule.archivedAt)).toEqual([null, "2026-09-01T00:00:00.000Z"]);
  });

  it("keeps the order it was given and carries the description and sort order", () => {
    const overview = buildRouteOverview([agency, recruiters], [], { prospectRows: [], messageRows: [] });
    expect(overview.map((route) => route.name)).toEqual(["Agency Overflow", "Recruiters"]);
    expect(overview[1]).toMatchObject({ description: "Agencies that place people", sortOrder: 1 });
  });
});
