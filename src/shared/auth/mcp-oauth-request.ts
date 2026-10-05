import {
  mcpOfflineAccessScope,
  mcpReadScope,
  mcpWriteScope
} from "@/shared/mcp/mcp-scopes";

const chatGptClientHost = "chatgpt.com";

function isChatGptClient(clientId: string | null): boolean {
  if (!clientId) return false;

  try {
    const url = new URL(clientId);
    return url.protocol === "https:" && url.hostname === chatGptClientHost && url.pathname.startsWith("/oauth/");
  } catch {
    return false;
  }
}

/**
 * ChatGPT initially discovers the MCP connection with a read-only scope. Its
 * later write calls use the same OAuth grant and request `outreach.write` at
 * the tool boundary. Normalize the trusted ChatGPT authorization request so
 * the persisted grant contains every Nodera MCP scope from the start.
 */
export function withChatGptMcpScopes(request: Request, resource: string): Request {
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/oauth2/authorize") || url.searchParams.get("resource") !== resource) return request;
  if (!isChatGptClient(url.searchParams.get("client_id"))) return request;

  const scopes = new Set((url.searchParams.get("scope") ?? "").split(/\s+/).filter(Boolean));
  scopes.add(mcpReadScope);
  scopes.add(mcpWriteScope);
  scopes.add(mcpOfflineAccessScope);
  url.searchParams.set("scope", [...scopes].join(" "));

  return new Request(url, request);
}
