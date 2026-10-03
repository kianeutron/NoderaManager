import { Hono } from "hono";
import { getOrganizationsServices } from "@/modules/organizations/application/organizations-services";
import { createOrganizationInputSchema, organizationChangesSchema, organizationDomainsSchema, organizationSearchQuerySchema, similarOrganizationCheckSchema } from "@/modules/organizations/domain/organization.schema";
import { zodValidator } from "@/shared/api/zod-validator";
import { idParamSchema } from "@/shared/api/field-schemas";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const organizationsRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .get("/", zodValidator("query", organizationSearchQuerySchema), async (context) => context.json(await getOrganizationsServices().searchOrganizations(context.req.valid("query")), 200, noStore))
  .get("/:id", zodValidator("param", idParamSchema), async (context) => {
    const organization = await getOrganizationsServices().getOrganization(context.req.valid("param").id);
    return organization ? context.json(organization, 200, noStore) : context.json({ code: "NOT_FOUND" }, 404, noStore);
  })
  .post("/", zodValidator("json", createOrganizationInputSchema), async (context) => context.json(await getOrganizationsServices().createOrganization(context.var.actor, context.req.valid("json")), 201, noStore))
  .patch("/:id", zodValidator("param", idParamSchema), zodValidator("json", organizationChangesSchema), async (context) => {
    return context.json(await getOrganizationsServices().updateOrganization(context.var.actor, { ...context.req.valid("json"), organizationId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/similar-check", zodValidator("json", similarOrganizationCheckSchema), async (context) => {
    return context.json({ data: { similar: await getOrganizationsServices().findSimilarOrganizations(context.req.valid("json")) } }, 200, noStore);
  })
  .post("/:id/archive", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getOrganizationsServices().archiveOrganization(context.var.actor, { organizationId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/restore", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getOrganizationsServices().restoreOrganization(context.var.actor, { organizationId: context.req.valid("param").id }), 200, noStore);
  })
  .put("/:id/domains", zodValidator("param", idParamSchema), zodValidator("json", organizationDomainsSchema), async (context) => {
    return context.json(await getOrganizationsServices().setOrganizationDomains(context.var.actor, { ...context.req.valid("json"), organizationId: context.req.valid("param").id }), 200, noStore);
  });

export type OrganizationsRoutes = typeof organizationsRoutes;
