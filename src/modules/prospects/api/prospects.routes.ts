import { Hono } from "hono";
import { getProspectsServices } from "@/modules/prospects/application/prospects-services";
import { createProspectInputSchema, prospectChangesSchema, prospectStatusChangeSchema } from "@/modules/prospects/domain/prospect.schema";
import { idParamSchema } from "@/shared/api/field-schemas";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const prospectsRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .get("/:id", zodValidator("param", idParamSchema), async (context) => {
    const prospect = await getProspectsServices().getProspect(context.req.valid("param").id);
    return prospect ? context.json(prospect, 200, noStore) : context.json({ code: "NOT_FOUND" }, 404, noStore);
  })
  .post("/", zodValidator("json", createProspectInputSchema), async (context) => context.json(await getProspectsServices().createProspect(context.var.actor, context.req.valid("json")), 201, noStore))
  .patch("/:id", zodValidator("param", idParamSchema), zodValidator("json", prospectChangesSchema), async (context) => {
    return context.json(await getProspectsServices().updateProspect(context.var.actor, { ...context.req.valid("json"), prospectId: context.req.valid("param").id }), 200, noStore);
  })
  .put("/:id/status", zodValidator("param", idParamSchema), zodValidator("json", prospectStatusChangeSchema), async (context) => {
    return context.json(await getProspectsServices().updateProspectStatus(context.var.actor, { ...context.req.valid("json"), prospectId: context.req.valid("param").id }), 200, noStore);
  });

export type ProspectsRoutes = typeof prospectsRoutes;
