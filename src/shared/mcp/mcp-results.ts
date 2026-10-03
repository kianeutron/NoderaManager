import type { CallToolResult } from "@modelcontextprotocol/server";

/** Compact JSON for the model plus the same object as structured output. */
export function toMcpSuccess<Result extends Record<string, unknown>>(result: Result): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
}

/** Errors the caller can act on. Never pass unexpected error messages through here: they may contain SQL or data. */
export function toMcpFailure(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}
