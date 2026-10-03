import { and, eq, inArray } from "drizzle-orm";
import type { TargetingRules } from "@/modules/campaigns/domain/campaign.schema";
import type { CampaignStatus } from "@/modules/campaigns/domain/campaign.types";
import { prepareAuditEvent } from "@/shared/audit/audit-event.repository";
import type { AuditEventInput } from "@/shared/audit/audit-event.schema";
import type { getDatabase } from "@/shared/db/client";
import { campaignProspects, campaignRoutes, campaigns } from "@/shared/db/schema/strategy";

type CampaignsDatabase = ReturnType<typeof getDatabase>;

export type CampaignRouteDraft = Readonly<{ routeId: string; routeModuleId: string | null }>;

export type NewCampaignDraft = Readonly<{
  campaignId: string;
  name: string;
  normalizedName: string;
  goal: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  targetingRules: TargetingRules;
  routes: readonly CampaignRouteDraft[];
  audit: AuditEventInput;
}>;

export type CampaignPatch = Readonly<{
  name?: string;
  normalizedName?: string;
  goal?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  targetingRules?: TargetingRules;
}>;

/** Each command is one `batch`, so the change and its audit event commit together or not at all. */
export function createCampaignCommandsRepository(database: CampaignsDatabase) {
  const touch = (campaignId: string) => database.update(campaigns).set({ updatedAt: new Date() }).where(eq(campaigns.id, campaignId));

  return {
    insertCampaign: async ({ audit: auditInput, campaignId, routes, ...values }: NewCampaignDraft): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.insert(campaigns).values({ id: campaignId, ...values }),
        ...(routes.length > 0 ? [database.insert(campaignRoutes).values(routes.map((route) => ({ campaignId, ...route })))] : []),
        audit.statement
      ]);
      return audit.id;
    },

    updateCampaign: async (campaignId: string, patch: CampaignPatch, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(campaigns).set({ ...patch, updatedAt: new Date() }).where(eq(campaigns.id, campaignId)), audit.statement]);
      return audit.id;
    },

    /** Replaces the whole set of routes the campaign works. */
    replaceRoutes: async (campaignId: string, routes: readonly CampaignRouteDraft[], auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([
        database.delete(campaignRoutes).where(eq(campaignRoutes.campaignId, campaignId)),
        ...(routes.length > 0 ? [database.insert(campaignRoutes).values(routes.map((route) => ({ campaignId, ...route })))] : []),
        touch(campaignId),
        audit.statement
      ]);
      return audit.id;
    },

    setStatus: async (campaignId: string, status: CampaignStatus, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(campaigns).set({ status, updatedAt: new Date() }).where(eq(campaigns.id, campaignId)), audit.statement]);
      return audit.id;
    },

    /** `null` restores. Only hides the campaign from lists: its members, messages and history stay. */
    setArchived: async (campaignId: string, archivedAt: Date | null, auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.update(campaigns).set({ archivedAt, updatedAt: new Date() }).where(eq(campaigns.id, campaignId)), audit.statement]);
      return audit.id;
    },

    /** Adds members that are not there yet; one already in is left alone. */
    addMembers: async (campaignId: string, prospectIds: readonly string[], auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.insert(campaignProspects).values(prospectIds.map((prospectId) => ({ campaignId, prospectId }))).onConflictDoNothing(), touch(campaignId), audit.statement]);
      return audit.id;
    },

    /** Takes prospects out of the campaign. Only the link goes: the prospects and everything logged for them stay. */
    removeMembers: async (campaignId: string, prospectIds: readonly string[], auditInput: AuditEventInput): Promise<string> => {
      const audit = prepareAuditEvent(database, auditInput);
      await database.batch([database.delete(campaignProspects).where(and(eq(campaignProspects.campaignId, campaignId), inArray(campaignProspects.prospectId, [...prospectIds]))), touch(campaignId), audit.statement]);
      return audit.id;
    }
  };
}

export type CampaignCommandsRepository = ReturnType<typeof createCampaignCommandsRepository>;
