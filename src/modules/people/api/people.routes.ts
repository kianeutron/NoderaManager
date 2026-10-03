import { Hono } from "hono";
import { getPeopleServices } from "@/modules/people/application/people-services";
import { createPersonInputSchema, doNotContactReasonSchema, personChangesSchema, personEmailsSchema, personIdentitySchema, personLinksSchema, personSearchQuerySchema } from "@/modules/people/domain/person.schema";
import { zodValidator } from "@/shared/api/zod-validator";
import { idParamSchema } from "@/shared/api/field-schemas";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

export const peopleRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .get("/", zodValidator("query", personSearchQuerySchema), async (context) => context.json(await getPeopleServices().searchPeople(context.req.valid("query")), 200, noStore))
  .get("/:id", zodValidator("param", idParamSchema), async (context) => {
    const person = await getPeopleServices().getPerson(context.req.valid("param").id);
    return person ? context.json(person, 200, noStore) : context.json({ code: "NOT_FOUND" }, 404, noStore);
  })
  .post("/duplicate-check", zodValidator("json", personIdentitySchema), async (context) => {
    const candidates = await getPeopleServices().findDuplicateCandidates(context.req.valid("json"));
    return context.json({ data: { candidates } }, 200, noStore);
  })
  .post("/", zodValidator("json", createPersonInputSchema), async (context) => context.json(await getPeopleServices().createPerson(context.var.actor, context.req.valid("json")), 201, noStore))
  .patch("/:id", zodValidator("param", idParamSchema), zodValidator("json", personChangesSchema), async (context) => {
    return context.json(await getPeopleServices().updatePerson(context.var.actor, { ...context.req.valid("json"), personId: context.req.valid("param").id }), 200, noStore);
  })
  .put("/:id/emails", zodValidator("param", idParamSchema), zodValidator("json", personEmailsSchema), async (context) => {
    return context.json(await getPeopleServices().setPersonEmails(context.var.actor, { ...context.req.valid("json"), personId: context.req.valid("param").id }), 200, noStore);
  })
  .put("/:id/links", zodValidator("param", idParamSchema), zodValidator("json", personLinksSchema), async (context) => {
    return context.json(await getPeopleServices().setPersonLinks(context.var.actor, { ...context.req.valid("json"), personId: context.req.valid("param").id }), 200, noStore);
  })
  .put("/:id/do-not-contact", zodValidator("param", idParamSchema), zodValidator("json", doNotContactReasonSchema), async (context) => {
    return context.json(await getPeopleServices().markPersonDoNotContact(context.var.actor, { ...context.req.valid("json"), personId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/archive", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getPeopleServices().archivePerson(context.var.actor, { personId: context.req.valid("param").id }), 200, noStore);
  })
  .post("/:id/restore", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getPeopleServices().restorePerson(context.var.actor, { personId: context.req.valid("param").id }), 200, noStore);
  })
  .delete("/:id/do-not-contact", zodValidator("param", idParamSchema), async (context) => {
    return context.json(await getPeopleServices().clearPersonDoNotContact(context.var.actor, { personId: context.req.valid("param").id }), 200, noStore);
  });

export type PeopleRoutes = typeof peopleRoutes;
