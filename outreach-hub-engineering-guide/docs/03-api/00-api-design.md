    # Typed API Design

    Use Hono under `/api` as a thin transport layer.

## Principles

- feature-owned routers;
- explicit verbs/resources;
- typed Hono RPC client for browser calls;
- Zod validation at request boundaries;
- consistent response envelope only where it adds value, not unnecessary nesting;
- stable error shape;
- version the API only when external consumers require it.

Example route responsibilities:

```text
POST /api/people/duplicate-check
POST /api/people
GET  /api/people/:id
GET  /api/people
POST /api/prospects/:id/outreach
POST /api/outreach/:id/interactions
GET  /api/analytics/overview
```

Handlers call application services. They do not contain Drizzle queries or duplicate/status logic.

Prefer command-specific endpoints over one generic PATCH endpoint for important state transitions, because command names preserve intent and audit semantics.


## Writes from the browser

State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) are refused unless their `Origin` header equals the site's own origin (`shared/api/same-origin-only.ts`, applied to the whole API). Plain field edits use `PATCH` with only the changed fields (`null` clears); state changes with their own meaning (do-not-contact, replacing emails or domains) are separate command endpoints. The verified actor comes from `ownerOnly` (`context.var.actor`), never from the request body.
