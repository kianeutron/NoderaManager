import type { McpServer } from "@modelcontextprotocol/server";
import type { ProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { addSignalInputSchema, createProspectInputSchema, prospectIdInputSchema, prospectSearchQuerySchema, updateProspectInputSchema, updateProspectStatusInputSchema } from "@/modules/prospects/domain/prospect.schema";
import { ApplicationError } from "@/shared/errors/application-error";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerProspectTools(server: McpServer, prospects: ProspectsServices): void {
  server.registerTool("search_prospects", {
    ...readOnlyTool("Search prospects", "Lists prospects, most recently updated first. Filter by text (qualification notes, person or organization name), statuses, route, module, person, organization, temperature or ISO country code. Returns compact rows; pass `nextCursor` back as `cursor` for the next page."),
    inputSchema: prospectSearchQuerySchema
  }, (query) => runMcpTool("search_prospects", () => prospects.searchProspects(query)));

  server.registerTool("get_prospect", {
    ...readOnlyTool("Get a prospect", "Returns one prospect with its person, organization, route and module, qualification notes, structural reason, signals and recent notes."),
    inputSchema: prospectIdInputSchema
  }, ({ prospectId }) => runMcpTool("get_prospect", async () => {
    const prospect = await prospects.getProspect(prospectId);
    if (!prospect) throw new ApplicationError("not_found", "Prospect not found");
    return { prospect };
  }));

  server.registerTool("create_prospect", {
    ...writeTool("Create a prospect", "Creates a prospect for a person and/or organization on a route (optionally a module of that route), starting as researched or ready. Idempotent: an open prospect for the same target and route/module is returned (created: false). A person marked do-not-contact is refused. Find route ids with list_routes and check for duplicate people first."),
    inputSchema: createProspectInputSchema
  }, (input, context) => runMcpTool("create_prospect", () => prospects.createProspect(actorOf(context), input)));

  server.registerTool("update_prospect", {
    ...writeTool("Update a prospect", "Changes route, module, temperature, source, why-targeted, current trigger or next action. Omitted fields stay; null clears an optional field. Changing the route without a module clears the module. Status has its own tool."),
    inputSchema: updateProspectInputSchema
  }, (input, context) => runMcpTool("update_prospect", () => prospects.updateProspect(actorOf(context), input)));

  server.registerTool("update_prospect_status", {
    ...writeTool("Update a prospect's status", "Moves a prospect to researched, ready, contacted, replied, warm, opportunity, proposal, won, lost, dormant or disqualified. Disqualifying requires a structuralReason (language, local_payroll, residency, clearance, compliance, other); it is cleared on any other status. Do not infer a structural rejection from an ambiguous reply: ask the owner. Setting the current status again is a no-op."),
    inputSchema: updateProspectStatusInputSchema
  }, (input, context) => runMcpTool("update_prospect_status", () => prospects.updateProspectStatus(actorOf(context), input)));

  server.registerTool("add_signal", {
    ...writeTool("Add a signal", "Records evidence that makes contacting a prospect timely (a live role, a client win, a contractor request). Idempotent: the same type and summary on the same prospect returns the existing signal."),
    inputSchema: addSignalInputSchema
  }, (input, context) => runMcpTool("add_signal", () => prospects.addSignal(actorOf(context), input)));
}
