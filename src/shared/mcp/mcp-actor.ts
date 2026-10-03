import { randomUUID } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import type { AuthenticatedActor } from "@/shared/auth/actor";

/** The verified bearer token is the only source of MCP identity; a missing one means the auth gate was bypassed. */
export function resolveMcpActor(authInfo: AuthInfo | undefined): AuthenticatedActor {
  if (!authInfo) throw new Error("MCP tool ran without verified authentication");
  return { id: authInfo.clientId, type: "mcp", requestId: randomUUID(), source: "mcp" };
}
