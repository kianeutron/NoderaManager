import { toNextJsHandler } from "better-auth/next-js";
import { auth, mcpResource } from "@/shared/auth/auth";
import { withChatGptMcpScopes } from "@/shared/auth/mcp-oauth-request";

const handler = toNextJsHandler(auth);
const mcpRefreshTokenLifetimeSeconds = 60 * 60 * 24 * 365;

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handler.GET(withChatGptMcpScopes(request, mcpResource));
}

export const { PUT, PATCH, DELETE } = handler;

/**
 * ChatGPT can renew a remote MCP connection without prompting when the token
 * response describes the refresh-token lifetime. Better Auth persists the
 * refresh token correctly, but does not include this optional response field.
 */
export async function POST(request: Request): Promise<Response> {
  const response = await handler.POST(request);
  if (!new URL(request.url).pathname.endsWith("/oauth2/token") || !response.ok || !response.headers.get("content-type")?.includes("application/json")) return response;

  const body = await response.clone().json() as Record<string, unknown>;
  if (typeof body.refresh_token !== "string" || body.refresh_token_expires_in !== undefined) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(JSON.stringify({ ...body, refresh_token_expires_in: mcpRefreshTokenLifetimeSeconds }), { status: response.status, statusText: response.statusText, headers });
}
