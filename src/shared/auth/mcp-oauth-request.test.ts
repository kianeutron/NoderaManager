import { describe, expect, it } from "vitest";
import { mcpOfflineAccessScope, mcpReadScope, mcpWriteScope } from "@/shared/mcp/mcp-scopes";
import { withChatGptMcpScopes } from "@/shared/auth/mcp-oauth-request";

const resource = "https://nodera-manager.vercel.app/mcp";

describe("withChatGptMcpScopes", () => {
  it("adds the complete Nodera scope set to ChatGPT authorization requests", () => {
    const request = new Request(`https://nodera-manager.vercel.app/api/auth/oauth2/authorize?client_id=https%3A%2F%2Fchatgpt.com%2Foauth%2Fclient.json&resource=${encodeURIComponent(resource)}&scope=${mcpReadScope}`);
    const normalized = withChatGptMcpScopes(request, resource);
    const scopes = new URL(normalized.url).searchParams.get("scope")?.split(" ");

    expect(scopes).toEqual(expect.arrayContaining([mcpReadScope, mcpWriteScope, mcpOfflineAccessScope]));
  });

  it("does not broaden unrelated clients or resources", () => {
    const request = new Request(`https://nodera-manager.vercel.app/api/auth/oauth2/authorize?client_id=https%3A%2F%2Fexample.com%2Foauth%2Fclient.json&resource=${encodeURIComponent(resource)}&scope=${mcpReadScope}`);
    expect(withChatGptMcpScopes(request, resource)).toBe(request);
  });
});
