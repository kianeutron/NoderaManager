import type { McpServer } from "@modelcontextprotocol/server";
import type { CampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import { ApplicationError } from "@/shared/errors/application-error";
import { campaignIdInputSchema, campaignMembersQuerySchema, campaignProspectsInputSchema, campaignSearchQuerySchema, campaignSuggestionsQuerySchema, createCampaignInputSchema, setCampaignRoutesInputSchema, setCampaignStatusInputSchema, updateCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerCampaignTools(server: McpServer, campaigns: CampaignsServices): void {
  server.registerTool("search_campaigns", {
    ...readOnlyTool("Search campaigns", "Lists campaigns, most recently changed first, each with its status, window, routes and what it has produced (members, contacted, won, messages, real replies). Filter by text (name), status, prospect id (campaigns that prospect belongs to) or scope archived. Pass `nextCursor` back as `cursor` for the next page."),
    inputSchema: campaignSearchQuerySchema
  }, (query) => runMcpTool("search_campaigns", () => campaigns.searchCampaigns(query)));

  server.registerTool("get_campaign", {
    ...readOnlyTool("Get a campaign", "Returns one campaign (archived ones too) with its goal, window, status, routes, targeting rules and what it has produced. Use list_campaign_prospects for its members."),
    inputSchema: campaignIdInputSchema
  }, ({ campaignId }) => runMcpTool("get_campaign", async () => {
    const campaign = await campaigns.getCampaign(campaignId);
    if (!campaign) throw new ApplicationError("not_found", "Campaign not found");
    return { campaign };
  }));

  server.registerTool("list_campaign_prospects", {
    ...readOnlyTool("List a campaign's prospects", "Returns the prospects in a campaign, most recently added first, with their status, route and last-contacted date. Pass `nextCursor` back as `cursor` for the next page."),
    inputSchema: campaignIdInputSchema.extend(campaignMembersQuerySchema.shape)
  }, ({ campaignId, ...query }) => runMcpTool("list_campaign_prospects", () => campaigns.listCampaignProspects(campaignId, campaignMembersQuerySchema.parse(query))));

  server.registerTool("suggest_campaign_prospects", {
    ...readOnlyTool("Suggest prospects for a campaign", "Lists prospects that could join a campaign, best fit first: open, not archived, not do-not-contact, on one of the campaign's routes and not already in it. Those matching the campaign's targeting rules (personas, countries, company types) come first and are marked matchesRules. Advisory only: nothing is added until add_campaign_prospects is called."),
    inputSchema: campaignIdInputSchema.extend(campaignSuggestionsQuerySchema.shape)
  }, ({ campaignId, ...query }) => runMcpTool("suggest_campaign_prospects", async () => ({ suggestions: await campaigns.suggestCampaignProspects(campaignId, campaignSuggestionsQuerySchema.parse(query)) })));

  server.registerTool("create_campaign", {
    ...writeTool("Create a campaign", "Creates a campaign as a draft: a name, optional goal and start/end window, the routes (or route modules) it works, and targeting rules (personas, ISO countries, company types) that only suggest prospects. Idempotent: a campaign with the same name (ignoring case) is returned unchanged (created: false); a name belonging to an archived campaign is refused."),
    inputSchema: createCampaignInputSchema
  }, (input, context) => runMcpTool("create_campaign", () => campaigns.createCampaign(actorOf(context), input)));

  server.registerTool("update_campaign", {
    ...writeTool("Update a campaign", "Changes a campaign's name, goal, start/end or targeting rules. Omitted fields stay; null clears the goal or a date. A completed or archived campaign cannot change. Routes and status have their own tools. Repeating the same change is a no-op."),
    inputSchema: updateCampaignInputSchema
  }, (input, context) => runMcpTool("update_campaign", () => campaigns.updateCampaign(actorOf(context), input)));

  server.registerTool("set_campaign_routes", {
    ...writeTool("Set a campaign's routes", "Replaces the whole list of routes the campaign works (a route alone covers every module; add routeModuleId to narrow to one module). A running campaign must keep at least one. Current members stay even if they no longer match."),
    inputSchema: setCampaignRoutesInputSchema
  }, (input, context) => runMcpTool("set_campaign_routes", () => campaigns.setCampaignRoutes(actorOf(context), input)));

  server.registerTool("set_campaign_status", {
    ...writeTool("Set a campaign's status", "Moves a campaign: draft to active, active to paused or completed, paused to active or completed. Starting needs at least one route. Completed is final. Asking for the current status is a no-op."),
    inputSchema: setCampaignStatusInputSchema
  }, (input, context) => runMcpTool("set_campaign_status", () => campaigns.setCampaignStatus(actorOf(context), input)));

  server.registerTool("archive_campaign", {
    ...writeTool("Archive a campaign", "Hides a campaign from lists. Its members, messages and history stay, and it can be restored. A running (active) campaign must be paused or completed first. Repeating it is a no-op."),
    inputSchema: campaignIdInputSchema
  }, (input, context) => runMcpTool("archive_campaign", () => campaigns.archiveCampaign(actorOf(context), input)));

  server.registerTool("restore_campaign", {
    ...writeTool("Restore a campaign", "Brings an archived campaign back into lists. Find archived campaigns with search_campaigns scope archived. Repeating it is a no-op."),
    inputSchema: campaignIdInputSchema
  }, (input, context) => runMcpTool("restore_campaign", () => campaigns.restoreCampaign(actorOf(context), input)));

  server.registerTool("add_campaign_prospects", {
    ...writeTool("Add prospects to a campaign", "Adds up to 50 prospects. Each must exist, not be archived, and be on one of the campaign's routes. Prospects already in are left alone. A completed campaign cannot change."),
    inputSchema: campaignProspectsInputSchema
  }, (input, context) => runMcpTool("add_campaign_prospects", () => campaigns.addCampaignProspects(actorOf(context), input)));

  server.registerTool("unlink_campaign_prospects", {
    ...writeTool("Unlink prospects from a campaign", "Takes prospects out of a campaign (like unlink_document, it removes one relationship only). Only the link is removed: the prospects and everything logged for them stay. Annotated destructive so clients confirm. Prospects that were not in it are ignored.", { removesData: true }),
    inputSchema: campaignProspectsInputSchema
  }, (input, context) => runMcpTool("unlink_campaign_prospects", () => campaigns.removeCampaignProspects(actorOf(context), input)));
}
