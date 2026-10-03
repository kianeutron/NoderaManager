import type { McpServer } from "@modelcontextprotocol/server";
import type { InteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import { listInteractionsQuerySchema, logBounceInputSchema, logInteractionInputSchema } from "@/modules/interactions/domain/interaction.schema";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerInteractionTools(server: McpServer, interactions: InteractionsServices): void {
  server.registerTool("list_interactions", {
    ...readOnlyTool("List a prospect's interactions", "Returns what happened with a prospect after the first message, newest first: replies, calls, meetings, follow-ups and bounces, each with its direction, channel, time, text, response depth and sentiment."),
    inputSchema: listInteractionsQuerySchema
  }, (query) => runMcpTool("list_interactions", async () => ({ interactions: await interactions.listInteractions(query) })));

  server.registerTool("log_interaction", {
    ...writeTool("Log an interaction", "Records something that ALREADY HAPPENED with a prospect: their reply or auto-reply (inbound), a follow-up message you sent (outbound), a call, a meeting, or another touchpoint. Their reply moves a contacted prospect to replied and marks the message it answers (pass outreachMessageId, which must belong to the same prospect). Anything outbound counts as contact and is refused for a do-not-contact person or a closed prospect; something they sent is always recorded. Set responseDepth (1 to 9) only when the owner classifies it; never guess. Use log_bounce for bounces. Pass an idempotencyKey so a retry returns the first result.", { idempotent: true }),
    inputSchema: logInteractionInputSchema
  }, (input, context) => runMcpTool("log_interaction", () => interactions.logInteraction(actorOf(context), input)));

  server.registerTool("log_bounce", {
    ...writeTool("Log a bounce", "Reports that a sent outreach message bounced (soft, hard or blocked). Sets the message's bounce state, marks its delivery failed, and records the bounce in the prospect's timeline. Reporting the same bounce again is a no-op."),
    inputSchema: logBounceInputSchema
  }, (input, context) => runMcpTool("log_bounce", () => interactions.logBounce(actorOf(context), input)));
}
