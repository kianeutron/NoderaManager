import { Hono } from "hono";
import { getRoutesServices } from "@/modules/routes/application/routes-services";
import { createRouteInputSchema, moduleChangesSchema, routeChangesSchema, routeModuleBodySchema, routeOverviewQuerySchema } from "@/modules/routes/domain/route.schema";
import { idParamSchema } from "@/shared/api/field-schemas";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const routesRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  // The active routes with their modules, for pickers.
  .get("/", async (context) => context.json({ routes: await getRoutesServices().listRoutes() }, 200, noStore))
  // Routes with what each has produced, for the routes page.
  .get("/overview", zodValidator("query", routeOverviewQuerySchema), async (context) => context.json({ routes: await getRoutesServices().getRouteOverview(context.req.valid("query")) }, 200, noStore))
  .post("/", zodValidator("json", createRouteInputSchema), async (context) => {
    const result = await getRoutesServices().createRoute(context.var.actor, context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200, noStore);
  })
  .patch("/modules/:id", zodValidator("param", idParamSchema), zodValidator("json", moduleChangesSchema), async (context) => {
    return context.json(await getRoutesServices().updateRouteModule(context.var.actor, { ...context.req.valid("json"), routeModuleId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/modules/:id/archive", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getRoutesServices().archiveRouteModule(context.var.actor, { routeModuleId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/modules/:id/restore", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getRoutesServices().restoreRouteModule(context.var.actor, { routeModuleId: context.req.valid("param").id }), 200, noStore);
  })
  .patch("/:id", zodValidator("param", idParamSchema), zodValidator("json", routeChangesSchema), async (context) => {
    return context.json(await getRoutesServices().updateRoute(context.var.actor, { ...context.req.valid("json"), routeId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/archive", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getRoutesServices().archiveRoute(context.var.actor, { routeId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/restore", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getRoutesServices().restoreRoute(context.var.actor, { routeId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/modules", zodValidator("param", idParamSchema), zodValidator("json", routeModuleBodySchema), async (context) => {
    const result = await getRoutesServices().createRouteModule(context.var.actor, { ...context.req.valid("json"), routeId: context.req.valid("param").id });
    return context.json(result, result.created ? 201 : 200, noStore);
  });

export type RoutesRoutes = typeof routesRoutes;
