import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = "/api/auth/.well-known/oauth-authorization-server";
  const response = await auth.handler(new Request(url, request));
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
