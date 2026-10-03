import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { analyticsRoutes } from "@/modules/analytics/api/analytics.routes";
import { campaignsRoutes } from "@/modules/campaigns/api/campaigns.routes";
import { followUpsRoutes } from "@/modules/followups/api/followups.routes";
import { interactionsRoutes } from "@/modules/interactions/api/interactions.routes";
import { libraryRoutes } from "@/modules/library/api/library.routes";
import { notesRoutes } from "@/modules/notes/api/notes.routes";
import { outreachRoutes } from "@/modules/outreach/api/outreach.routes";
import { organizationsRoutes } from "@/modules/organizations/api/organizations.routes";
import { peopleRoutes } from "@/modules/people/api/people.routes";
import { prospectsRoutes } from "@/modules/prospects/api/prospects.routes";
import { routesRoutes } from "@/modules/routes/api/routes.routes";
import { handleApiError, handleApiNotFound } from "@/shared/api/api-error-handler";
import { sameOriginOnly } from "@/shared/api/same-origin-only";

const api = new Hono().basePath("/api");

// The request id is echoed in the `X-Request-Id` header, logged with unexpected errors, and shown to the user, so a report can be traced.
api.use(requestId());
api.use(sameOriginOnly);

api.get("/health", (context) => context.json({ status: "ok" }, 200, { "Cache-Control": "no-store" }));

api.route("/library", libraryRoutes);
api.route("/people", peopleRoutes);
api.route("/organizations", organizationsRoutes);
api.route("/notes", notesRoutes);
api.route("/outreach", outreachRoutes);
api.route("/interactions", interactionsRoutes);
api.route("/followups", followUpsRoutes);
api.route("/campaigns", campaignsRoutes);
api.route("/prospects", prospectsRoutes);
api.route("/routes", routesRoutes);
api.route("/analytics", analyticsRoutes);

api.onError(handleApiError);
api.notFound(handleApiNotFound);

const handle = (request: Request) => api.fetch(request);
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
