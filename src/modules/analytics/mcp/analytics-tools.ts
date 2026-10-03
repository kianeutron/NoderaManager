import type { McpServer } from "@modelcontextprotocol/server";
import type { AnalyticsServices } from "@/modules/analytics/application/create-analytics-services";
import { breakdownQuerySchema, insightsQuerySchema, overviewQuerySchema } from "@/modules/analytics/domain/analytics.schema";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { readOnlyTool } from "@/shared/mcp/tool-metadata";

export function registerAnalyticsTools(server: McpServer, analytics: AnalyticsServices): void {
  server.registerTool("get_overview", {
    ...readOnlyTool("Outreach overview", "Returns the same figures as the Overview page for the last 7, 30 or 90 days (UTC days), each compared with the equally long period before: messages sent, prospects reached, real replies, and the reply rate as prospects replied out of prospects reached (always read it with its counts). Also the pipeline by prospect status, channel mix, how deep replies went, messages still waiting on an answer, overdue follow-ups, route results and active campaigns."),
    inputSchema: overviewQuerySchema
  }, (query) => runMcpTool("get_overview", () => analytics.getOverview(query)));

  server.registerTool("get_analytics", {
    ...readOnlyTool("Outreach analytics", "Returns the same figures as the Analytics page for the last 7, 30, 90, 180 or 365 days (UTC), compared with the equally long period before: messages sent, prospects reached, reply rate (prospects replied out of prospects reached) and bounce rate (bounces out of emails sent), always with their counts; a trend per day (per week beyond 90 days); the funnel from reached to replied to engaged (qualification question or deeper), call and commercial step, counting only replies whose depth you classified, with prospects won apart; how long first replies took; the weekday and hour (UTC) messages were sent and answered; and delivery and bounce counts. Small samples say little: check the counts before drawing a conclusion. Use get_performance_breakdown to split results by route, persona, country and more."),
    inputSchema: insightsQuerySchema
  }, (query) => runMcpTool("get_analytics", () => analytics.getInsights(query)));

  server.registerTool("get_performance_breakdown", {
    ...readOnlyTool("Performance breakdown", "Splits messages sent in the window by one dimension (route, module, persona, country, organizationType, channel, campaign or source), biggest group first, with messages sent, prospects reached, prospects replied and bounces per group. Compute a reply rate only as repliedProspects out of reached and mention the sample size. A null key means the value is not recorded. Country is the person's, else their company's. Replaces separate route, persona and country statistics."),
    inputSchema: breakdownQuerySchema
  }, (query) => runMcpTool("get_performance_breakdown", () => analytics.getBreakdown(query)));
}
