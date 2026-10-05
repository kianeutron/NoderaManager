// @vitest-environment node
import { createMcpHandler, type AuthInfo } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsServices } from "@/modules/analytics/application/create-analytics-services";
import type { CampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import type { FollowUpsServices } from "@/modules/followups/application/create-followups-services";
import type { InteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import type { LibraryServices } from "@/modules/library/application/create-library-services";
import type { NotesServices } from "@/modules/notes/application/create-notes-services";
import type { OutreachServices } from "@/modules/outreach/application/create-outreach-services";
import type { createBulkOutreachImportService } from "@/modules/outreach/application/bulk-outreach-import.service";
import type { OrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import type { PeopleServices } from "@/modules/people/application/create-people-services";
import type { ProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import type { RoutesServices } from "@/modules/routes/application/create-routes-services";
import { ApplicationError } from "@/shared/errors/application-error";
import { buildMcpServer, type McpServerContext } from "@/shared/mcp/build-mcp-server";
import { createFakeServices, type FakeServices } from "@/test/fake-services";

const id = "0198d5a0-7b1e-7c3a-9d2e-4f5a6b7c8d90";
const readOnlyToken = ["outreach.read"];
const writeToken = ["outreach.read", "outreach.write"];

// Tools that remove a relationship and nothing else. Annotated destructive so clients confirm.
const linkRemovalTools = new Set(["unlink_document", "unlink_campaign_prospects"]);

const readTools = [
  "find_duplicate_candidates", "get_document_metadata", "get_document_text", "get_library_facets", "get_analytics", "get_organization", "get_campaign", "get_overview", "get_performance_breakdown", "get_outreach_message", "get_person", "get_prospect", "get_route_overview", "preview_bulk_outreach_import",
  "list_campaign_prospects", "list_interactions", "list_routes", "search_library", "search_organizations", "search_campaigns", "search_followups", "search_outreach", "search_people", "search_prospects", "suggest_campaign_prospects"
];
const writeTools = [
  "commit_bulk_outreach_import",
  "add_campaign_prospects", "add_document_version", "add_note", "add_signal", "archive_document", "archive_campaign", "archive_folder", "archive_organization", "archive_person", "archive_route", "archive_route_module", "clear_person_do_not_contact", "complete_followup", "create_campaign", "create_folder", "create_followup", "create_organization", "create_person",
  "create_prospect", "create_route", "create_route_module", "create_text_document", "dismiss_followup", "link_document", "log_bounce", "log_interaction", "log_outreach", "mark_person_do_not_contact", "rename_folder", "restore_campaign", "restore_document", "restore_organization", "restore_person", "restore_route", "restore_route_module",
  "set_campaign_routes", "set_campaign_status", "set_document_tags", "set_organization_domains", "set_person_emails", "set_person_links", "unlink_campaign_prospects", "unlink_document", "update_campaign", "update_document", "update_followup", "update_organization", "update_person", "update_prospect", "update_prospect_status", "update_route", "update_route_module"
];

type FakeContext = { [Key in keyof McpServerContext]: FakeServices<McpServerContext[Key]> };

function createContext(overrides: Partial<FakeContext> = {}): FakeContext {
  return {
    people: createFakeServices<PeopleServices>(),
    organizations: createFakeServices<OrganizationsServices>(),
    routes: createFakeServices<RoutesServices>(),
    prospects: createFakeServices<ProspectsServices>(),
    notes: createFakeServices<NotesServices>(),
    outreach: createFakeServices<OutreachServices>(),
    interactions: createFakeServices<InteractionsServices>(),
    followUps: createFakeServices<FollowUpsServices>(),
    campaigns: createFakeServices<CampaignsServices>(),
    library: createFakeServices<LibraryServices>(),
    analytics: createFakeServices<AnalyticsServices>(),
    bulkOutreachImport: createFakeServices<ReturnType<typeof createBulkOutreachImportService>>(),
    ...overrides
  };
}

async function rpc(context: McpServerContext, body: Record<string, unknown>, scopes: string[], clientId = "chatgpt-client") {
  const handler = createMcpHandler(() => buildMcpServer(context), { legacy: "stateless", responseMode: "json" });
  const authInfo: AuthInfo = { token: "test", clientId, scopes, expiresAt: Math.floor(Date.now() / 1000) + 3600 };
  const response = await handler.fetch(new Request("http://localhost/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }) }), { authInfo });

  const text = await response.text();
  const data = text.split("\n").find((line) => line.startsWith("data: "));
  return { status: response.status, headers: response.headers, json: data ? JSON.parse(data.slice(6)) : text.length > 0 ? JSON.parse(text) : null };
}

const callTool = (context: McpServerContext, name: string, args: Record<string, unknown>, scopes = writeToken, clientId?: string) => rpc(context, { method: "tools/call", params: { name, arguments: args } }, scopes, clientId);

describe("MCP tools", () => {
  afterEach(() => vi.restoreAllMocks());

  it("exposes exactly the expected tools and nothing destructive", async () => {
    const { json } = await rpc(createContext(), { method: "tools/list" }, readOnlyToken);
    const names: string[] = json.result.tools.map((tool: { name: string }) => tool.name);

    expect(names.toSorted()).toEqual([...readTools, ...writeTools].toSorted());
    expect(names.filter((name) => /delete|purge|sql|remove/.test(name))).toEqual([]);
  });

  it("annotates reads as read-only and writes honestly", async () => {
    const { json } = await rpc(createContext(), { method: "tools/list" }, readOnlyToken);
    const tools = new Map<string, { annotations: Record<string, boolean> }>(json.result.tools.map((tool: { name: string; annotations: Record<string, boolean> }) => [tool.name, tool]));

    for (const name of readTools) expect(tools.get(name)?.annotations.readOnlyHint, name).toBe(true);
    for (const name of writeTools) {
      expect(tools.get(name)?.annotations, name).toMatchObject({ readOnlyHint: false, openWorldHint: false });
      expect(tools.get(name)?.annotations.destructiveHint, name).toBe(linkRemovalTools.has(name));
    }
    expect(tools.get("create_text_document")?.annotations.idempotentHint).toBe(true);
    expect(tools.get("create_prospect")?.annotations.idempotentHint).toBe(true);
    expect(tools.get("create_person")?.annotations.idempotentHint).toBe(false);
    expect(tools.get("unlink_document")?.annotations.idempotentHint).toBe(false);
  });

  it("refuses every write tool to a read-only token with a scope challenge, and still lets reads through", async () => {
    const context = createContext();

    for (const name of writeTools) {
      const denied = await callTool(context, name, {}, readOnlyToken);
      expect(denied.status, name).toBe(403);
      expect(denied.headers.get("www-authenticate"), name).toContain('scope="outreach.write"');
    }
    for (const service of [context.people, context.organizations, context.routes, context.prospects, context.notes, context.library]) {
      expect(Object.values(service).every((method) => method.mock.calls.length === 0)).toBe(true);
    }

    const search = await callTool(context, "search_people", { q: "marta" }, readOnlyToken);
    expect(search.json.result.isError).toBeUndefined();
    expect(context.people.searchPeople).toHaveBeenCalledWith(expect.objectContaining({ q: "marta", sort: "updated", limit: 25 }));
  });

  it("runs writes as the verified MCP actor with validated, defaulted input", async () => {
    const context = createContext();
    await callTool(context, "create_person", { fullName: "  Marta   Chen ", emails: ["Marta@Bluewave.io", "marta@bluewave.io"], languages: ["EN", "en", "de"], countryCode: "de" }, writeToken, "chatgpt-client");

    expect(context.people.createPerson).toHaveBeenCalledWith(
      expect.objectContaining({ id: "chatgpt-client", type: "mcp", source: "mcp", requestId: expect.any(String) }),
      { fullName: "Marta Chen", emails: ["Marta@Bluewave.io"], languages: ["en", "de"], countryCode: "DE", confirmNewIdentity: false }
    );

    await callTool(context, "create_prospect", { personId: id, routeId: id }, writeToken);
    expect(context.prospects.createProspect).toHaveBeenCalledWith(expect.anything(), { personId: id, routeId: id, status: "researched" });
  });

  it("logs outreach as the verified client, parses the send time, and ignores no caller-supplied person", async () => {
    const context = createContext();
    await callTool(context, "log_outreach", { prospectId: id, channel: "email", body: " Hi ", sentAt: "2026-09-01T10:00:00Z", idempotencyKey: "retry-key-001" }, writeToken, "chatgpt-client");

    expect(context.outreach.logOutreach).toHaveBeenCalledWith(expect.objectContaining({ id: "chatgpt-client", type: "mcp" }), { prospectId: id, channel: "email", body: "Hi", sentAt: new Date("2026-09-01T10:00:00Z"), idempotencyKey: "retry-key-001" });

    const { json } = await callTool(context, "log_outreach", { prospectId: id, personId: id, channel: "email", body: "Hi" }, writeToken);
    expect(json.result.isError).toBe(true);
  });

  it("logs interactions and bounces as the verified client, and lists them with a read-only token", async () => {
    const context = createContext({ interactions: createFakeServices<InteractionsServices>({ listInteractions: vi.fn().mockResolvedValue([]) }) });
    await callTool(context, "log_interaction", { prospectId: id, direction: "inbound", channel: "email", type: "reply", body: " Yes ", responseDepth: 3 }, writeToken, "chatgpt-client");
    expect(context.interactions.logInteraction).toHaveBeenCalledWith(expect.objectContaining({ id: "chatgpt-client", type: "mcp" }), { prospectId: id, direction: "inbound", channel: "email", type: "reply", body: "Yes", responseDepth: 3 });

    await callTool(context, "log_bounce", { outreachMessageId: id, bounceStatus: "hard" }, writeToken, "chatgpt-client");
    expect(context.interactions.logBounce).toHaveBeenCalledWith(expect.objectContaining({ id: "chatgpt-client" }), { outreachMessageId: id, bounceStatus: "hard" });

    const list = await callTool(context, "list_interactions", { prospectId: id }, readOnlyToken);
    expect(list.json.result.isError).toBeUndefined();
    const refused = await callTool(context, "log_interaction", { prospectId: id, direction: "inbound", channel: "email", type: "reply", body: "Yes" }, readOnlyToken);
    expect(refused.status === 403 || refused.json?.error || refused.json?.result?.isError).toBeTruthy();
  });

  it("tells the assistant which rule a wrongly-shaped interaction broke", async () => {
    const { json } = await callTool(createContext(), "log_interaction", { prospectId: id, direction: "outbound", channel: "email", type: "reply", body: "x" });

    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain("A reply comes from them");
  });

  it("manages follow-ups as the verified client and lets a read-only token only search", async () => {
    const context = createContext({ followUps: createFakeServices<FollowUpsServices>({ searchFollowUps: vi.fn().mockResolvedValue({ items: [], total: 0, nextCursor: null }) }) });
    await callTool(context, "create_followup", { prospectId: id, reason: " Ask about budget ", dueAt: "2026-11-01T00:00:00Z" }, writeToken, "chatgpt-client");
    expect(context.followUps.createFollowUp).toHaveBeenCalledWith(expect.objectContaining({ id: "chatgpt-client", type: "mcp" }), { prospectId: id, reason: "Ask about budget", dueAt: new Date("2026-11-01T00:00:00Z") });

    await callTool(context, "update_followup", { followUpId: id, dueAt: null }, writeToken);
    expect(context.followUps.updateFollowUp).toHaveBeenCalledWith(expect.anything(), { followUpId: id, dueAt: null });
    await callTool(context, "complete_followup", { followUpId: id }, writeToken);
    expect(context.followUps.completeFollowUp).toHaveBeenCalledWith(expect.anything(), { followUpId: id });
    await callTool(context, "dismiss_followup", { followUpId: id, reason: "Not worth it" }, writeToken);
    expect(context.followUps.dismissFollowUp).toHaveBeenCalledWith(expect.anything(), { followUpId: id, reason: "Not worth it" });

    const search = await callTool(context, "search_followups", { due: "overdue" }, readOnlyToken);
    expect(search.json.result.isError).toBeUndefined();
    expect(context.followUps.searchFollowUps).toHaveBeenCalledWith({ status: "active", due: "overdue", sort: "due", limit: 25 });
    const refused = await callTool(context, "complete_followup", { followUpId: id }, readOnlyToken);
    expect(refused.status === 403 || refused.json?.error || refused.json?.result?.isError).toBeTruthy();
  });

  it("tells the assistant which rule a badly dated follow-up broke", async () => {
    const { json } = await callTool(createContext(), "create_followup", { prospectId: id, reason: "x", dueAt: "2026-10-01T00:00:00Z", notBeforeAt: "2026-11-01T00:00:00Z" });

    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain("not before");
  });

  it("manages campaigns as the verified client, and lets a read-only token only read", async () => {
    const context = createContext({ campaigns: createFakeServices<CampaignsServices>({ searchCampaigns: vi.fn().mockResolvedValue({ items: [], total: 0, nextCursor: null }), suggestCampaignProspects: vi.fn().mockResolvedValue([]) }) });
    await callTool(context, "create_campaign", { name: " Q4 agencies ", targetingRules: { countries: ["de"] }, routes: [{ routeId: id }] }, writeToken, "chatgpt-client");
    expect(context.campaigns.createCampaign).toHaveBeenCalledWith(expect.objectContaining({ id: "chatgpt-client", type: "mcp" }), { name: "Q4 agencies", targetingRules: { personas: [], countries: ["DE"], organizationTypes: [] }, routes: [{ routeId: id }] });

    await callTool(context, "set_campaign_status", { campaignId: id, status: "active" }, writeToken);
    expect(context.campaigns.setCampaignStatus).toHaveBeenCalledWith(expect.anything(), { campaignId: id, status: "active" });
    await callTool(context, "add_campaign_prospects", { campaignId: id, prospectIds: [id, id] }, writeToken);
    expect(context.campaigns.addCampaignProspects).toHaveBeenCalledWith(expect.anything(), { campaignId: id, prospectIds: [id] });
    await callTool(context, "unlink_campaign_prospects", { campaignId: id, prospectIds: [id] }, writeToken);
    expect(context.campaigns.removeCampaignProspects).toHaveBeenCalledWith(expect.anything(), { campaignId: id, prospectIds: [id] });

    expect((await callTool(context, "search_campaigns", { status: "active" }, readOnlyToken)).json.result.isError).toBeUndefined();
    expect((await callTool(context, "suggest_campaign_prospects", { campaignId: id }, readOnlyToken)).json.result.isError).toBeUndefined();
    expect(context.campaigns.suggestCampaignProspects).toHaveBeenCalledWith(id, { limit: 25 });
    const refused = await callTool(context, "archive_campaign", { campaignId: id }, readOnlyToken);
    expect(refused.status === 403 || refused.json?.error || refused.json?.result?.isError).toBeTruthy();
    expect(context.campaigns.archiveCampaign).not.toHaveBeenCalled();
  });

  it("tells the assistant what is wrong with a badly shaped campaign", async () => {
    const { json } = await callTool(createContext(), "create_campaign", { name: "x", startsAt: "2026-12-01T00:00:00Z", endsAt: "2026-10-01T00:00:00Z" });

    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain("end cannot be before the start");
  });

  it("manages routes: edits, archives, and an overview a read-only token may read", async () => {
    const context = createContext({ routes: createFakeServices<RoutesServices>({ getRouteOverview: vi.fn().mockResolvedValue([]) }) });
    await callTool(context, "update_route", { routeId: id, name: " Recruiters ", sortOrder: 2 }, writeToken, "chatgpt-client");
    expect(context.routes.updateRoute).toHaveBeenCalledWith(expect.objectContaining({ id: "chatgpt-client" }), { routeId: id, name: "Recruiters", sortOrder: 2 });
    await callTool(context, "archive_route_module", { routeModuleId: id }, writeToken);
    expect(context.routes.archiveRouteModule).toHaveBeenCalledWith(expect.anything(), { routeModuleId: id });

    expect((await callTool(context, "get_route_overview", {}, readOnlyToken)).json.result.isError).toBeUndefined();
    expect(context.routes.getRouteOverview).toHaveBeenCalledWith({ scope: "active" });
  });

  it("lets a read-only token read the overview, defaulting to 30 days", async () => {
    const context = createContext({ analytics: createFakeServices<AnalyticsServices>({ getOverview: vi.fn().mockResolvedValue({ range: "30d" }) }) });

    expect((await callTool(context, "get_overview", {}, readOnlyToken)).json.result.isError).toBeUndefined();
    expect(context.analytics.getOverview).toHaveBeenCalledWith({ range: "30d" });
    expect((await callTool(context, "get_overview", { range: "1y" }, readOnlyToken)).json.result.isError).toBe(true);
  });

  it("lets a read-only token read analytics and a breakdown, with defaults, and refuses a dimension it does not know", async () => {
    const context = createContext({ analytics: createFakeServices<AnalyticsServices>({ getInsights: vi.fn().mockResolvedValue({}), getBreakdown: vi.fn().mockResolvedValue({}) }) });

    expect((await callTool(context, "get_analytics", {}, readOnlyToken)).json.result.isError).toBeUndefined();
    expect(context.analytics.getInsights).toHaveBeenCalledWith({ range: "90d" });
    expect((await callTool(context, "get_performance_breakdown", { by: "persona", range: "365d" }, readOnlyToken)).json.result.isError).toBeUndefined();
    expect(context.analytics.getBreakdown).toHaveBeenCalledWith({ range: "365d", by: "persona", limit: 25 });
    expect((await callTool(context, "get_performance_breakdown", { by: "password" }, readOnlyToken)).json.result.isError).toBe(true);
    expect((await callTool(context, "get_performance_breakdown", { limit: 500 }, readOnlyToken)).json.result.isError).toBe(true);
  });

  it("lets a read-only token search outreach but not log it", async () => {
    const context = createContext({ outreach: createFakeServices<OutreachServices>({ searchOutreach: vi.fn().mockResolvedValue({ items: [], total: 0, nextCursor: null }) }) });

    const search = await callTool(context, "search_outreach", {}, readOnlyToken);
    expect(search.json.result.isError).toBeUndefined();

    const log = await callTool(context, "log_outreach", { prospectId: id, channel: "email", body: "Hi" }, readOnlyToken);
    expect(log.status === 403 || log.json?.error || log.json?.result?.isError).toBeTruthy();
    expect(context.outreach.logOutreach).not.toHaveBeenCalled();
  });

  it("derives a fresh request id per call and shares no state between requests", async () => {
    const context = createContext();
    await callTool(context, "archive_document", { documentId: id }, writeToken, "client-a");
    await callTool(context, "archive_document", { documentId: id }, writeToken, "client-b");

    const actors = context.library.archiveDocument.mock.calls.map(([actor]) => actor);
    expect(actors.map((actor) => actor.id)).toEqual(["client-a", "client-b"]);
    expect(actors[0].requestId).not.toBe(actors[1].requestId);
  });

  it.each([
    ["a malformed id", "archive_document", { documentId: "nope" }],
    ["an unknown field", "archive_document", { documentId: id, hardDelete: true }],
    ["an empty document update", "update_document", { documentId: id }],
    ["too many tags", "set_document_tags", { documentId: id, tags: Array.from({ length: 11 }, (_, index) => `tag ${index}`) }],
    ["a NUL character", "create_text_document", { title: "x", content: "a\u0000b" }],
    ["an over-long search", "search_library", { limit: 500 }],
    ["a person without a name", "create_person", { role: "CTO" }],
    ["a bad email", "create_person", { fullName: "Marta Chen", emails: ["not-an-email"] }],
    ["a bad country code", "update_person", { personId: id, countryCode: "Germany" }],
    ["a non-LinkedIn profile URL", "create_person", { fullName: "Marta Chen", linkedinUrl: "https://example.com/in/marta" }],
    ["an empty person update", "update_person", { personId: id }],
    ["a do-not-contact flag without a reason", "mark_person_do_not_contact", { personId: id }],
    ["an organization with a bad domain", "create_organization", { name: "Acme", domains: ["not a domain"] }],
    ["an unknown organization type", "create_organization", { name: "Acme", organizationType: "startup" }],
    ["a prospect with no person or organization", "create_prospect", { routeId: id }],
    ["a prospect starting as won", "create_prospect", { personId: id, routeId: id, status: "won" }],
    ["a retired prospect status", "update_prospect_status", { prospectId: id, status: "engaged" }],
    ["a signal expiring before it was observed", "add_signal", { prospectId: id, type: "live_role", summary: "Hiring", observedAt: "2026-09-02T10:00:00Z", expiresAt: "2026-09-01T10:00:00Z" }],
    ["a note without a target", "add_note", { body: "Met at the conference", targets: [] }],
    ["a note on an unsupported record type", "add_note", { body: "x", targets: [{ targetType: "route", targetId: id }] }],
    ["a prospect search cursor from garbage", "search_prospects", { cursor: "garbage" }]
  ])("rejects %s before any service runs", async (_case, tool, args) => {
    const context = createContext();
    const { json } = await callTool(context, tool, args);

    expect(json.result.isError).toBe(true);
    for (const service of [context.people, context.organizations, context.routes, context.prospects, context.notes, context.library]) {
      expect(Object.values(service).every((method) => method.mock.calls.length === 0), tool).toBe(true);
    }
  });

  it("reports expected failures verbatim so the caller can correct itself, from any module", async () => {
    const context = createContext({
      prospects: createFakeServices<ProspectsServices>({ updateProspectStatus: vi.fn().mockRejectedValue(new ApplicationError("conflict", "That prospect is already closed")) })
    });
    const { json } = await callTool(context, "update_prospect_status", { prospectId: id, status: "dormant" });

    expect(json.result).toMatchObject({ isError: true, content: [{ type: "text", text: "That prospect is already closed" }] });
  });

  it("tells the caller which field to fix when a status change breaks the structural-reason rule", async () => {
    const { json } = await callTool(createContext(), "update_prospect_status", { prospectId: id, status: "disqualified" });

    expect(json.result.isError).toBe(true);
    expect(json.result.content[0].text).toContain("Choose why this prospect is disqualified");
  });

  it("never leaks unexpected error details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const context = createContext({
      people: createFakeServices<PeopleServices>({ createPerson: vi.fn().mockRejectedValue(new Error("insert into people (email) values ('secret@x.io') failed: postgres://user:pw@host")) })
    });
    const { json } = await callTool(context, "create_person", { fullName: "Marta Chen" });

    expect(json.result.isError).toBe(true);
    expect(JSON.stringify(json)).not.toMatch(/secret|postgres|insert into/);
    expect(consoleError).toHaveBeenCalledWith("unexpected_error", { scope: "mcp", tool: "create_person", errorName: "Error" });
  });

  it.each([
    ["get_person", "getPerson", "Person not found", { personId: id }],
    ["get_organization", "getOrganization", "Organization not found", { organizationId: id }],
    ["get_prospect", "getProspect", "Prospect not found", { prospectId: id }],
    ["get_document_metadata", "getDocument", "Document not found", { documentId: id }]
  ])("returns not-found for a missing record from %s instead of an empty success", async (tool, method, message, args) => {
    const services = {
      get_person: { people: createFakeServices<PeopleServices>({ [method]: vi.fn().mockResolvedValue(null) }) },
      get_organization: { organizations: createFakeServices<OrganizationsServices>({ [method]: vi.fn().mockResolvedValue(null) }) },
      get_prospect: { prospects: createFakeServices<ProspectsServices>({ [method]: vi.fn().mockResolvedValue(null) }) },
      get_document_metadata: { library: createFakeServices<LibraryServices>({ [method]: vi.fn().mockResolvedValue(null) }) }
    }[tool];
    const { json } = await callTool(createContext(services), tool, args, readOnlyToken);

    expect(json.result).toMatchObject({ isError: true, content: [{ text: message }] });
  });

  it("returns compact structured output alongside the text form", async () => {
    const context = createContext({ routes: createFakeServices<RoutesServices>({ createRoute: vi.fn().mockResolvedValue({ routeId: id, created: true, auditEventId: "audit-1" }) }) });
    const { json } = await callTool(context, "create_route", { name: "Agency overflow" });

    expect(json.result.structuredContent).toEqual({ routeId: id, created: true, auditEventId: "audit-1" });
    expect(JSON.parse(json.result.content[0].text)).toEqual(json.result.structuredContent);
  });
});
