import { Hono } from "hono";
import { getOutreachServices } from "@/modules/outreach/application/outreach-services";
import { logOutreachInputSchema, outreachSearchQuerySchema, outreachTargetQuerySchema } from "@/modules/outreach/domain/outreach.schema";
import { idParamSchema } from "@/shared/api/field-schemas";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const outreachRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .get("/messages", zodValidator("query", outreachSearchQuerySchema), async (context) => context.json(await getOutreachServices().searchOutreach(context.req.valid("query")), 200, noStore))
  .get("/messages/:id", zodValidator("param", idParamSchema), async (context) => {
    const message = await getOutreachServices().getOutreachMessage(context.req.valid("param").id);
    return message ? context.json(message, 200, noStore) : context.json({ code: "NOT_FOUND" }, 404, noStore);
  })
  .get("/summary", async (context) => context.json(await getOutreachServices().getOutreachSummary(), 200, noStore))
  .get("/targets", zodValidator("query", outreachTargetQuerySchema), async (context) => context.json({ targets: await getOutreachServices().listOutreachTargets(context.req.valid("query")) }, 200, noStore))
  .post("/messages", zodValidator("json", logOutreachInputSchema), async (context) => {
    const result = await getOutreachServices().logOutreach(context.var.actor, context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200, noStore);
  });

export type OutreachRoutes = typeof outreachRoutes;
