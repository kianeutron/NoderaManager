import type { CallToolResult } from "@modelcontextprotocol/server";
import { classifyError } from "@/shared/errors/classify-error";
import { logUnexpectedError } from "@/shared/observability/log-unexpected-error";
import { toMcpFailure, toMcpSuccess } from "@/shared/mcp/mcp-results";

/**
 * Runs a tool body and maps the outcome to MCP. Expected failures are shown to the caller so it can correct itself.
 * Anything else can carry SQL, parameters or private data, so only the error name is logged and nothing is echoed back.
 */
export async function runMcpTool(tool: string, action: () => Promise<Record<string, unknown>>): Promise<CallToolResult> {
  try {
    return toMcpSuccess(await action());
  } catch (error) {
    const expected = classifyError(error);
    if (expected) return toMcpFailure(expected.message);
    logUnexpectedError("mcp", error, { tool });
    return toMcpFailure("The request could not be completed.");
  }
}
