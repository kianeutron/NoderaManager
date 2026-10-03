import { getMcpAuthorizationConfiguration, getMcpResourceUrl } from "@/shared/mcp/mcp-authentication";
import { mcpReadScope, mcpWriteScope } from "@/shared/mcp/mcp-scopes";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const configuration = getMcpAuthorizationConfiguration();
  if (!configuration) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  const metadata = {
    resource: getMcpResourceUrl(configuration).href,
    authorization_servers: [configuration.MCP_AUTHORIZATION_SERVER],
    scopes_supported: [mcpReadScope, mcpWriteScope],
    resource_name: "Outreach Hub"
  };

  return Response.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store"
    }
  });
}
