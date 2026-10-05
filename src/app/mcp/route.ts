import { createMcpHandler } from "@modelcontextprotocol/server";
import { requireMcpAuth } from "@better-auth/mcp";
import { auth, mcpResource } from "@/shared/auth/auth";
import { buildMcpServer } from "@/shared/mcp/build-mcp-server";
import { getMcpServices } from "@/shared/mcp/mcp-services";
import { mcpReadScope } from "@/shared/mcp/mcp-scopes";
import { RateLimitedError } from "@/shared/errors/application-error";
import { mcpPolicy } from "@/shared/rate-limit/rate-limit-policies";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handler = createMcpHandler(
  () => buildMcpServer(getMcpServices()),
  { legacy: "reject", maxRequestBodySize: 256 * 1024, responseMode: "json" }
);

const protectedHandler = requireMcpAuth(auth, async (request, accessTokenClaims) => {
  const clientId = typeof accessTokenClaims.client_id === "string" ? accessTokenClaims.client_id : accessTokenClaims.sub;
  if (typeof clientId !== "string" || clientId.length === 0) return Response.json({ error: "invalid_token" }, { status: 401 });

  try {
    await getRateLimiter().enforce(clientId, mcpPolicy);
  } catch (error) {
    if (!(error instanceof RateLimitedError)) throw error;
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(error.retryAfterSeconds) } });
  }

  const response = await handler.fetch(request, {
    authInfo: {
      token: "redacted",
      clientId,
      scopes: typeof accessTokenClaims.scope === "string" ? accessTokenClaims.scope.split(" ").filter(Boolean) : [],
      ...(typeof accessTokenClaims.exp === "number" ? { expiresAt: accessTokenClaims.exp } : {}),
      resource: new URL(mcpResource)
    }
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}, {
  resource: mcpResource,
  requiredScopes: [mcpReadScope],
  challengeScopes: [mcpReadScope]
});

export async function POST(request: Request): Promise<Response> {
  return protectedHandler(request);
}
