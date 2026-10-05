// Plain constants (no server-only imports) so routes, protected-resource metadata and tool registration can share them.
export const mcpReadScope = "outreach.read";
export const mcpWriteScope = "outreach.write";
/** OAuth refresh-token scope required by ChatGPT to keep a remote MCP app connected. */
export const mcpOfflineAccessScope = "offline_access";
