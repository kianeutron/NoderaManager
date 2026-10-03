import { requireScopes, type ServerContext } from "@modelcontextprotocol/server";
import { resolveMcpActor } from "@/shared/mcp/mcp-actor";
import { mcpWriteScope } from "@/shared/mcp/mcp-scopes";

// Shared tool metadata. Schemas and handlers stay at each registration so the SDK's schema-dependent types stay concrete.

export const readOnlyTool = (title: string, description: string) => ({ title, description, annotations: { readOnlyHint: true, openWorldHint: false } });

/** Writes need the write scope on top of the read scope the endpoint already demands. No tool deletes data. */
export const writeTool = (title: string, description: string, { idempotent = true, removesData = false } = {}) => ({
  title,
  description,
  annotations: { readOnlyHint: false, destructiveHint: removesData, idempotentHint: idempotent, openWorldHint: false },
  scopeChallenge: requireScopes(mcpWriteScope)
});

export const actorOf = (context: ServerContext) => resolveMcpActor(context.http?.authInfo);
