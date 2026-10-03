import type { McpServer } from "@modelcontextprotocol/server";
import type { OrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { createOrganizationInputSchema, organizationIdInputSchema, organizationSearchQuerySchema, setOrganizationDomainsInputSchema, updateOrganizationInputSchema } from "@/modules/organizations/domain/organization.schema";
import { ApplicationError } from "@/shared/errors/application-error";
import { runMcpTool } from "@/shared/mcp/run-mcp-tool";
import { actorOf, readOnlyTool, writeTool } from "@/shared/mcp/tool-metadata";

export function registerOrganizationTools(server: McpServer, organizations: OrganizationsServices): void {
  server.registerTool("search_organizations", {
    ...readOnlyTool("Search organizations", "Lists organizations, most recently updated first or by name. Filter by text (name or domain), type or ISO country code. Set scope to archived to list archived organizations (to find one to restore). Returns compact rows; pass `nextCursor` back as `cursor` for the next page."),
    inputSchema: organizationSearchQuerySchema
  }, (query) => runMcpTool("search_organizations", () => organizations.searchOrganizations(query)));

  server.registerTool("get_organization", {
    ...readOnlyTool("Get an organization", "Returns one organization (archived ones too) with its domains, people, prospects, archivedAt and recent notes."),
    inputSchema: organizationIdInputSchema
  }, ({ organizationId }) => runMcpTool("get_organization", async () => {
    const organization = await organizations.getOrganization(organizationId);
    if (!organization) throw new ApplicationError("not_found", "Organization not found");
    return { organization };
  }));

  server.registerTool("create_organization", {
    ...writeTool("Create an organization", "Creates an organization. Domains (first is canonical) are the strongest duplicate signal: a domain that already belongs to an organization blocks creation and the error names it. A matching name alone only returns `similarOrganizations` as advisory. Writes an audit event."),
    inputSchema: createOrganizationInputSchema
  }, (input, context) => runMcpTool("create_organization", () => organizations.createOrganization(actorOf(context), input)));

  server.registerTool("update_organization", {
    ...writeTool("Update an organization", "Changes name, type, size band, website, LinkedIn URL, country, industry or notes. Omitted fields stay; null clears an optional field. Repeating the same change is a no-op."),
    inputSchema: updateOrganizationInputSchema
  }, (input, context) => runMcpTool("update_organization", () => organizations.updateOrganization(actorOf(context), input)));

  server.registerTool("set_organization_domains", {
    ...writeTool("Set an organization's domains", "Replaces the organization's whole domain list (first is canonical, at most 10). Refused if another organization owns a domain. Send an empty list to clear."),
    inputSchema: setOrganizationDomainsInputSchema
  }, (input, context) => runMcpTool("set_organization_domains", () => organizations.setOrganizationDomains(actorOf(context), input)));

  server.registerTool("archive_organization", {
    ...writeTool("Archive an organization", "Hides an organization from lists and searches. Its people, prospects and history stay, and it can be restored. Use instead of deleting, which is not possible. Repeating it is a no-op."),
    inputSchema: organizationIdInputSchema
  }, (input, context) => runMcpTool("archive_organization", () => organizations.archiveOrganization(actorOf(context), input)));

  server.registerTool("restore_organization", {
    ...writeTool("Restore an organization", "Brings an archived organization back into lists and searches. Find archived organizations with search_organizations scope archived. Repeating it is a no-op."),
    inputSchema: organizationIdInputSchema
  }, (input, context) => runMcpTool("restore_organization", () => organizations.restoreOrganization(actorOf(context), input)));
}
