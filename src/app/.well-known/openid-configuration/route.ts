import { serveOAuthDiscovery } from "@/shared/auth/oauth-discovery";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return serveOAuthDiscovery(request);
}
