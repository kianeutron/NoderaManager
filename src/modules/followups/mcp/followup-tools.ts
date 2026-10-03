import type { McpServer } from "@modelcontextprotocol/server";
import type { FollowUpsServices } from "@/modules/followups/application/create-followups-services";
import { createFollowUpInputSchema, dismissFollowUpInputSchema, followUpIdInputSchema, followUpSearchQuerySchema, updateFollowUpInputSchema } from "@/modules/followups/domain/followup.schema";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerFollowUpTools(server: McpServer, followUps: FollowUpsServices): void {
  server.registerTool("search_followups", {
    ...readOnlyTool("Search follow-ups", "Lists follow-ups, soonest due first (undated last), or most recently changed. Defaults to active ones; set status to completed or dismissed for finished ones. Filter by due bucket (overdue, next_7_days, later, no_date) or prospect id. Use due=overdue to see what is late. Pass `nextCursor` back as `cursor` for the next page."),
    inputSchema: followUpSearchQuerySchema
  }, (query) => runMcpTool("search_followups", () => followUps.searchFollowUps(query)));

  server.registerTool("create_followup", {
    ...writeTool("Create a follow-up", "Plans getting back to a prospect: a reason and, optionally, a due date (the deadline), a not-before date (the earliest sensible moment, for someone who said \"after the summer\") and a suggested channel. Use with a dormant status for a timing-only no. Refused for a do-not-contact person, a closed or archived prospect, or an archived contact. An open follow-up with the same reason on the same prospect is returned instead of adding a second.", { idempotent: true }),
    inputSchema: createFollowUpInputSchema
  }, (input, context) => runMcpTool("create_followup", () => followUps.createFollowUp(actorOf(context), input)));

  server.registerTool("update_followup", {
    ...writeTool("Update a follow-up", "Changes an active follow-up's reason, due date, not-before date or suggested channel. Omitted fields stay; null clears a date or the channel. Repeating the same change is a no-op. A completed or dismissed follow-up cannot change."),
    inputSchema: updateFollowUpInputSchema
  }, (input, context) => runMcpTool("update_followup", () => followUps.updateFollowUp(actorOf(context), input)));

  server.registerTool("complete_followup", {
    ...writeTool("Complete a follow-up", "Marks an active follow-up done. Completing it does not log any outreach: do that with log_outreach or log_interaction. Repeating it is a no-op."),
    inputSchema: followUpIdInputSchema
  }, (input, context) => runMcpTool("complete_followup", () => followUps.completeFollowUp(actorOf(context), input)));

  server.registerTool("dismiss_followup", {
    ...writeTool("Dismiss a follow-up", "Lets an active follow-up go without doing it, and keeps why. Use when it is no longer worth pursuing. Repeating it is a no-op."),
    inputSchema: dismissFollowUpInputSchema
  }, (input, context) => runMcpTool("dismiss_followup", () => followUps.dismissFollowUp(actorOf(context), input)));
}
