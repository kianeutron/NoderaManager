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
import type { McpServerContext } from "@/shared/mcp/build-mcp-server";

/** Every application service the MCP tools call, wired to the real database and providers. Built per request. */
export function getMcpServices(): McpServerContext {
  return {
    people: getPeopleServices(),
    organizations: getOrganizationsServices(),
    routes: getRoutesServices(),
    prospects: getProspectsServices(),
    notes: getNotesServices(),
    outreach: getOutreachServices(),
    interactions: getInteractionsServices(),
    followUps: getFollowUpsServices(),
    campaigns: getCampaignsServices(),
    library: getLibraryServices(),
    analytics: getAnalyticsServices()
  };
}
