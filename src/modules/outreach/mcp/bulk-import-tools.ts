import type { McpServer } from "@modelcontextprotocol/server";
import type { createBulkOutreachImportService } from "@/modules/outreach/application/bulk-outreach-import.service";
import { bulkOutreachImportInputSchema, commitBulkOutreachImportInputSchema } from "@/modules/outreach/domain/bulk-import.schema";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";

type BulkOutreachImportService = ReturnType<typeof createBulkOutreachImportService>;

export function registerBulkOutreachImportTools(server: McpServer, imports: BulkOutreachImportService): void {
  server.registerTool("preview_bulk_outreach_import", {
    ...readOnlyTool("Preview a bulk outreach import", "Validates 1–50 historical outreach records, matches organizations by domain and people by email/LinkedIn, identifies reusable prospects, and returns a persisted importId plus exact create/reuse/failure counts. This never writes CRM records.",),
    inputSchema: bulkOutreachImportInputSchema
  }, (input, context) => runMcpTool("preview_bulk_outreach_import", () => imports.preview(actorOf(context), input)));

  server.registerTool("commit_bulk_outreach_import", {
    ...writeTool("Commit a bulk outreach import", "Commits a previously previewed historical import by importId. Each record uses the same organization, person, prospect, campaign, outreach, interaction, bounce, audit, and idempotency services as the single-record tools. Records report partial failures; retries are safe with the same idempotency key.", { idempotent: true }),
    inputSchema: commitBulkOutreachImportInputSchema
  }, (input, context) => runMcpTool("commit_bulk_outreach_import", () => imports.commit(actorOf(context), input)));
}
