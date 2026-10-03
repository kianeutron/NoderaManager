import { Hono } from "hono";
import { getInteractionsServices } from "@/modules/interactions/application/interactions-services";
import { listInteractionsQuerySchema, logBounceInputSchema, logInteractionInputSchema } from "@/modules/interactions/domain/interaction.schema";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { zodValidator } from "@/shared/api/zod-validator";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const interactionsRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .get("/", zodValidator("query", listInteractionsQuerySchema), async (context) => context.json({ interactions: await getInteractionsServices().listInteractions(context.req.valid("query")) }, 200, noStore))
  .post("/", zodValidator("json", logInteractionInputSchema), async (context) => {
    const result = await getInteractionsServices().logInteraction(context.var.actor, context.req.valid("json"));
    return context.json(result, result.created ? 201 : 200, noStore);
  })
  .post("/bounces", zodValidator("json", logBounceInputSchema), async (context) => context.json(await getInteractionsServices().logBounce(context.var.actor, context.req.valid("json")), 200, noStore));

export type InteractionsRoutes = typeof interactionsRoutes;
