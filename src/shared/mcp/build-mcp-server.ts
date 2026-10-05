import { McpServer } from "@modelcontextprotocol/server";
import type { AnalyticsServices } from "@/modules/analytics/application/create-analytics-services";
import { registerAnalyticsTools } from "@/modules/analytics/mcp/analytics-tools";
import type { CampaignsServices } from "@/modules/campaigns/application/create-campaigns-services";
import { registerCampaignTools } from "@/modules/campaigns/mcp/campaign-tools";
import type { FollowUpsServices } from "@/modules/followups/application/create-followups-services";
import { registerFollowUpTools } from "@/modules/followups/mcp/followup-tools";
import type { InteractionsServices } from "@/modules/interactions/application/create-interactions-services";
import { registerInteractionTools } from "@/modules/interactions/mcp/interaction-tools";
import type { LibraryServices } from "@/modules/library/application/create-library-services";
import { registerLibraryTools } from "@/modules/library/mcp/library-tools";
import type { NotesServices } from "@/modules/notes/application/create-notes-services";
import { registerNoteTools } from "@/modules/notes/mcp/note-tools";
import type { OrganizationsServices } from "@/modules/organizations/application/create-organizations-services";
import { registerOrganizationTools } from "@/modules/organizations/mcp/organization-tools";
import type { OutreachServices } from "@/modules/outreach/application/create-outreach-services";
import type { createBulkOutreachImportService } from "@/modules/outreach/application/bulk-outreach-import.service";
import { registerBulkOutreachImportTools } from "@/modules/outreach/mcp/bulk-import-tools";
import { registerOutreachTools } from "@/modules/outreach/mcp/outreach-tools";
import type { PeopleServices } from "@/modules/people/application/create-people-services";
import { registerPeopleTools } from "@/modules/people/mcp/people-tools";
import type { ProspectsServices } from "@/modules/prospects/application/create-prospects-services";
import { registerProspectTools } from "@/modules/prospects/mcp/prospect-tools";
import type { RoutesServices } from "@/modules/routes/application/create-routes-services";
import { registerRouteTools } from "@/modules/routes/mcp/route-tools";

export type McpServerContext = Readonly<{
  people: PeopleServices;
  organizations: OrganizationsServices;
  routes: RoutesServices;
  prospects: ProspectsServices;
  notes: NotesServices;
  outreach: OutreachServices;
  bulkOutreachImport: ReturnType<typeof createBulkOutreachImportService>;
  interactions: InteractionsServices;
  followUps: FollowUpsServices;
  campaigns: CampaignsServices;
  library: LibraryServices;
  analytics: AnalyticsServices;
}>;

/** Tool registration lives with each module; this only composes them into one server. */
export function buildMcpServer(context: McpServerContext): McpServer {
  const server = new McpServer({ name: "outreach-hub", version: "0.1.0" });

  registerPeopleTools(server, context.people);
  registerOrganizationTools(server, context.organizations);
  registerRouteTools(server, context.routes);
  registerProspectTools(server, context.prospects);
  registerNoteTools(server, context.notes);
  registerOutreachTools(server, context.outreach);
  registerBulkOutreachImportTools(server, context.bulkOutreachImport);
  registerInteractionTools(server, context.interactions);
  registerFollowUpTools(server, context.followUps);
  registerCampaignTools(server, context.campaigns);
  registerLibraryTools(server, context.library);
  registerAnalyticsTools(server, context.analytics);

  return server;
}
