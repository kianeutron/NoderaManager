import { Hono } from "hono";
import { getCampaignsServices } from "@/modules/campaigns/application/campaigns-services";
import { campaignChangesSchema, campaignMembersQuerySchema, campaignProspectsBodySchema, campaignRoutesBodySchema, campaignSearchQuerySchema, campaignStatusBodySchema, campaignSuggestionsQuerySchema, createCampaignInputSchema } from "@/modules/campaigns/domain/campaign.schema";
import { idParamSchema } from "@/shared/api/field-schemas";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const campaignsRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .get("/", zodValidator("query", campaignSearchQuerySchema), async (context) => context.json(await getCampaignsServices().searchCampaigns(context.req.valid("query")), 200, noStore))
  .get("/:id", zodValidator("param", idParamSchema), async (context) => {
    const campaign = await getCampaignsServices().getCampaign(context.req.valid("param").id);
    return campaign ? context.json(campaign, 200, noStore) : context.json({ code: "NOT_FOUND" }, 404, noStore);
  })
  .get("/:id/members", zodValidator("param", idParamSchema), zodValidator("query", campaignMembersQuerySchema), async (context) => {
    return context.json(await getCampaignsServices().listCampaignProspects(context.req.valid("param").id, context.req.valid("query")), 200, noStore);
  })
  .get("/:id/suggestions", zodValidator("param", idParamSchema), zodValidator("query", campaignSuggestionsQuerySchema), async (context) => {
    return context.json({ suggestions: await getCampaignsServices().suggestCampaignProspects(context.req.valid("param").id, context.req.valid("query")) }, 200, noStore);
  })
  .post("/", zodValidator("json", createCampaignInputSchema), async (context) => {
    const result = await getCampaignsServices().createCampaign(context.var.actor, context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200, noStore);
  })
  .patch("/:id", zodValidator("param", idParamSchema), zodValidator("json", campaignChangesSchema), async (context) => {
    return context.json(await getCampaignsServices().updateCampaign(context.var.actor, { ...context.req.valid("json"), campaignId: context.req.valid("param").id }), 200, noStore);
  })
  .put("/:id/routes", zodValidator("param", idParamSchema), zodValidator("json", campaignRoutesBodySchema), async (context) => {
    return context.json(await getCampaignsServices().setCampaignRoutes(context.var.actor, { ...context.req.valid("json"), campaignId: context.req.valid("param").id }), 200, noStore);
  })
  .put("/:id/status", zodValidator("param", idParamSchema), zodValidator("json", campaignStatusBodySchema), async (context) => {
    return context.json(await getCampaignsServices().setCampaignStatus(context.var.actor, { ...context.req.valid("json"), campaignId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/archive", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getCampaignsServices().archiveCampaign(context.var.actor, { campaignId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/restore", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getCampaignsServices().restoreCampaign(context.var.actor, { campaignId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/prospects", zodValidator("param", idParamSchema), zodValidator("json", campaignProspectsBodySchema), async (context) => {
    return context.json(await getCampaignsServices().addCampaignProspects(context.var.actor, { ...context.req.valid("json"), campaignId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/prospects/remove", zodValidator("param", idParamSchema), zodValidator("json", campaignProspectsBodySchema), async (context) => {
    return context.json(await getCampaignsServices().removeCampaignProspects(context.var.actor, { ...context.req.valid("json"), campaignId: context.req.valid("param").id }), 200, noStore);
  });

export type CampaignsRoutes = typeof campaignsRoutes;
