import type { McpServer } from "@modelcontextprotocol/server";
import type { RoutesServices } from "@/modules/routes/application/create-routes-services";
import { createRouteInputSchema, createRouteModuleInputSchema, routeIdInputSchema, routeModuleIdInputSchema, routeOverviewQuerySchema, updateRouteInputSchema, updateRouteModuleInputSchema } from "@/modules/routes/domain/route.schema";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerRouteTools(server: McpServer, routes: RoutesServices): void {
  server.registerTool("list_routes", readOnlyTool("List routes and modules", "Returns every active acquisition route with its modules and ids. Prospects are attributed to a route (and optionally one of its modules), so use this to find the ids create_prospect needs. Routes are strategies, not channels."), () => runMcpTool("list_routes", async () => ({ routes: await routes.listRoutes() })));

  server.registerTool("create_route", {
    ...writeTool("Create a route", "Creates an acquisition route such as Agency Overflow or Recruiters. Idempotent: a route with the same name (case-insensitive) is returned unchanged (created: false)."),
    inputSchema: createRouteInputSchema
  }, (input, context) => runMcpTool("create_route", () => routes.createRoute(actorOf(context), input)));

  server.registerTool("create_route_module", {
    ...writeTool("Create a route module", "Creates a module (a narrower tactic) inside a route. Idempotent: a module with the same name in the same route is returned unchanged (created: false)."),
    inputSchema: createRouteModuleInputSchema
  }, (input, context) => runMcpTool("create_route_module", () => routes.createRouteModule(actorOf(context), input)));

  server.registerTool("get_route_overview", {
    ...readOnlyTool("Route overview with results", "Returns every route (set scope to archived for archived ones) with its modules and what each has produced so far: prospects, open prospects, won, messages sent and real replies. Use it to see which routes are working, under-tested or saturated."),
    inputSchema: routeOverviewQuerySchema
  }, (query) => runMcpTool("get_route_overview", async () => ({ routes: await routes.getRouteOverview(query) })));

  server.registerTool("update_route", {
    ...writeTool("Update a route", "Renames, describes or re-orders an active route (sortOrder sets where it sits in lists). Omitted fields stay; null clears the description. A name another route has is refused. Repeating the same change is a no-op."),
    inputSchema: updateRouteInputSchema
  }, (input, context) => runMcpTool("update_route", () => routes.updateRoute(actorOf(context), input)));

  server.registerTool("update_route_module", {
    ...writeTool("Update a route module", "Renames or describes a module of an active route. Omitted fields stay; null clears the description. A name another module of the same route has is refused. Repeating the same change is a no-op."),
    inputSchema: updateRouteModuleInputSchema
  }, (input, context) => runMcpTool("update_route_module", () => routes.updateRouteModule(actorOf(context), input)));

  server.registerTool("archive_route", {
    ...writeTool("Archive a route", "Hides a route from pickers and lists. Its prospects, messages and history stay, and it can be restored. Use instead of deleting, which is not possible. Repeating it is a no-op."),
    inputSchema: routeIdInputSchema
  }, (input, context) => runMcpTool("archive_route", () => routes.archiveRoute(actorOf(context), input)));

  server.registerTool("restore_route", {
    ...writeTool("Restore a route", "Brings an archived route back into pickers and lists. Find archived routes with get_route_overview scope archived. Repeating it is a no-op."),
    inputSchema: routeIdInputSchema
  }, (input, context) => runMcpTool("restore_route", () => routes.restoreRoute(actorOf(context), input)));

  server.registerTool("archive_route_module", {
    ...writeTool("Archive a route module", "Hides a module from pickers. Its prospects, messages and history stay, and it can be restored. Repeating it is a no-op."),
    inputSchema: routeModuleIdInputSchema
  }, (input, context) => runMcpTool("archive_route_module", () => routes.archiveRouteModule(actorOf(context), input)));

  server.registerTool("restore_route_module", {
    ...writeTool("Restore a route module", "Brings an archived module back into pickers. Repeating it is a no-op."),
    inputSchema: routeModuleIdInputSchema
  }, (input, context) => runMcpTool("restore_route_module", () => routes.restoreRouteModule(actorOf(context), input)));
}
