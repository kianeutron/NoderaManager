import "server-only";
import { auth } from "@/shared/auth/auth";

/**
 * Better Auth serves the provider metadata below its auth base path. The aliases
 * are kept in one adapter because MCP clients probe both OAuth and OIDC discovery
 * locations while constructing a browser authorization flow.
 */
export async function serveOAuthDiscovery(request: Request): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = "/api/auth/.well-known/oauth-authorization-server";
  const response = await auth.handler(new Request(url, request));
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
