import type { McpServer } from "@modelcontextprotocol/server";
import type { OutreachServices } from "@/modules/outreach/application/create-outreach-services";
import { logOutreachInputSchema, outreachMessageIdInputSchema, outreachSearchQuerySchema } from "@/modules/outreach/domain/outreach.schema";
import { ApplicationError } from "@/shared/errors/application-error";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerOutreachTools(server: McpServer, outreach: OutreachServices): void {
  server.registerTool("search_outreach", {
    ...readOnlyTool("Search outreach", "Lists logged outreach messages, newest first. Filter by text (person or company name, or words in the message), channel, reply status or prospect id. Returns compact rows with a short preview; use get_outreach_message for the full text. Pass `nextCursor` back as `cursor` for the next page."),
    inputSchema: outreachSearchQuerySchema
  }, (query) => runMcpTool("search_outreach", () => outreach.searchOutreach(query)));

  server.registerTool("get_outreach_message", {
    ...readOnlyTool("Get an outreach message", "Returns one logged message with its full text, delivery, bounce and reply status, and the prospect it belongs to."),
    inputSchema: outreachMessageIdInputSchema
  }, ({ messageId }) => runMcpTool("get_outreach_message", async () => {
    const message = await outreach.getOutreachMessage(messageId);
    if (!message) throw new ApplicationError("not_found", "Outreach message not found");
    return { message };
  }));

  server.registerTool("log_outreach", {
    ...writeTool("Log outreach", "Records a message that was ALREADY SENT to a prospect; never use it for a draft. The person and organization come from the prospect. Pass campaignId to log it under a campaign (the prospect must be a member and the campaign active). Refused for a person marked do-not-contact, a closed or archived prospect, or an archived contact. Logging moves a researched or ready prospect to contacted and updates last-contacted. Pass an idempotencyKey (8+ characters, unique per message) so a retry returns the first result instead of logging twice. sentAt defaults to now and cannot be in the future.", { idempotent: true }),
    inputSchema: logOutreachInputSchema
  }, (input, context) => runMcpTool("log_outreach", () => outreach.logOutreach(actorOf(context), input)));
}
