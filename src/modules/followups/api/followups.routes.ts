import { Hono } from "hono";
import { getFollowUpsServices } from "@/modules/followups/application/followups-services";
import { createFollowUpInputSchema, dismissReasonSchema, followUpChangesSchema, followUpSearchQuerySchema } from "@/modules/followups/domain/followup.schema";
import { idParamSchema } from "@/shared/api/field-schemas";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const followUpsRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .get("/", zodValidator("query", followUpSearchQuerySchema), async (context) => context.json(await getFollowUpsServices().searchFollowUps(context.req.valid("query")), 200, noStore))
  .get("/summary", async (context) => context.json(await getFollowUpsServices().getFollowUpSummary(), 200, noStore))
  .get("/:id", zodValidator("param", idParamSchema), async (context) => {
    const followUp = await getFollowUpsServices().getFollowUp(context.req.valid("param").id);
    return followUp ? context.json(followUp, 200, noStore) : context.json({ code: "NOT_FOUND" }, 404, noStore);
  })
  .post("/", zodValidator("json", createFollowUpInputSchema), async (context) => {
    const result = await getFollowUpsServices().createFollowUp(context.var.actor, context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200, noStore);
  })
  .patch("/:id", zodValidator("param", idParamSchema), zodValidator("json", followUpChangesSchema), async (context) => {
    return context.json(await getFollowUpsServices().updateFollowUp(context.var.actor, { ...context.req.valid("json"), followUpId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/complete", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getFollowUpsServices().completeFollowUp(context.var.actor, { followUpId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/dismiss", zodValidator("param", idParamSchema), zodValidator("json", dismissReasonSchema), async (context) => {
    return context.json(await getFollowUpsServices().dismissFollowUp(context.var.actor, { ...context.req.valid("json"), followUpId: context.req.valid("param").id }), 200, noStore);
  });

export type FollowUpsRoutes = typeof followUpsRoutes;
