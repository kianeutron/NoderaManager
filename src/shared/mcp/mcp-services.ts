import { getAnalyticsServices } from "@/modules/analytics/application/analytics-services";
import { getCampaignsServices } from "@/modules/campaigns/application/campaigns-services";
import { getFollowUpsServices } from "@/modules/followups/application/followups-services";
import { getInteractionsServices } from "@/modules/interactions/application/interactions-services";
import { getLibraryServices } from "@/modules/library/application/library-services";
import { getNotesServices } from "@/modules/notes/application/notes-services";
import { getOrganizationsServices } from "@/modules/organizations/application/organizations-services";
import { getOutreachServices } from "@/modules/outreach/application/outreach-services";
import { getPeopleServices } from "@/modules/people/application/people-services";
import { getProspectsServices } from "@/modules/prospects/application/prospects-services";
import { getRoutesServices } from "@/modules/routes/application/routes-services";
import { createBulkOutreachImportService } from "@/modules/outreach/application/bulk-outreach-import.service";
import { createBulkImportRepository } from "@/modules/outreach/data/bulk-import.repository";
import { createExternalRefRepository } from "@/shared/integrations/external-ref.repository";
import { getDatabase } from "@/shared/db/client";
import type { McpServerContext } from "@/shared/mcp/build-mcp-server";

/** Every application service the MCP tools call, wired to the real database and providers. Built per request. */
export function getMcpServices(): McpServerContext {
  const database = getDatabase();
  const people = getPeopleServices();
  const organizations = getOrganizationsServices();
  const prospects = getProspectsServices();
  const campaigns = getCampaignsServices();
  const outreach = getOutreachServices();
  const interactions = getInteractionsServices();
  return {
    people,
    organizations,
    routes: getRoutesServices(),
    prospects,
    notes: getNotesServices(),
    outreach,
    interactions,
    followUps: getFollowUpsServices(),
    campaigns,
    library: getLibraryServices(),
    analytics: getAnalyticsServices(),
    bulkOutreachImport: createBulkOutreachImportService({ people, organizations, prospects, campaigns, outreach, interactions, imports: createBulkImportRepository(database), externalRefs: createExternalRefRepository(database) })
  };
}
