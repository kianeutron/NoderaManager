import { createMcpHandler, requireBearerAuth } from "@modelcontextprotocol/server";
import { buildMcpServer } from "@/shared/mcp/build-mcp-server";
import { createMcpTokenVerifier, getMcpAuthorizationConfiguration, getMcpResourceUrl } from "@/shared/mcp/mcp-authentication";
import { getMcpServices } from "@/shared/mcp/mcp-services";
import { mcpReadScope } from "@/shared/mcp/mcp-scopes";
import { RateLimitedError } from "@/shared/errors/application-error";
import { mcpPolicy } from "@/shared/rate-limit/rate-limit-policies";
import { getRateLimiter } from "@/shared/rate-limit/rate-limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function configurationRequiredResponse(): Response {
  return Response.json({ error: "MCP authorization is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

async function serveMcpRequest(request: Request): Promise<Response> {
  const configuration = getMcpAuthorizationConfiguration();
  if (!configuration) return configurationRequiredResponse();

  const resourceUrl = getMcpResourceUrl(configuration);
  const metadataUrl = new URL("/.well-known/oauth-protected-resource/mcp", configuration.NEXT_PUBLIC_APP_URL).href;
  const authenticate = requireBearerAuth({
    verifier: createMcpTokenVerifier(configuration),
    requiredScopes: [mcpReadScope],
    resourceMetadataUrl: metadataUrl
  });
  const authentication = await authenticate(request);
  if (authentication instanceof Response) return authentication;

  try {
    await getRateLimiter().enforce(authentication.clientId, mcpPolicy);
  } catch (error) {
    if (!(error instanceof RateLimitedError)) throw error;
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(error.retryAfterSeconds) } });
  }

  const handler = createMcpHandler(
    () => buildMcpServer(getMcpServices()),
    { legacy: "stateless", maxRequestBodySize: 256 * 1024, responseMode: "json" }
  );

  const response = await handler.fetch(request, { authInfo: { ...authentication, resource: resourceUrl } });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request): Promise<Response> {
  return serveMcpRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return serveMcpRequest(request);
}
