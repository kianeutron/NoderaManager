    # System Architecture

    ## Deployment unit

One Vercel project contains:

- Next.js web application.
- Hono API mounted under `/api`.
- MCP Streamable HTTP endpoint at `/mcp`.
- auth endpoints.
- Vercel functions/route handlers.

External managed persistence:

- Neon Postgres for relational data.
- private Vercel Blob for files.

## Layering

`UI -> API adapter -> application service -> repositories/adapters -> Postgres/Blob`

`MCP -> MCP adapter -> application service -> repositories/adapters -> Postgres/Blob`

The MCP route MUST NOT call the HTTP API. The HTTP API MUST NOT call the MCP route. Both call shared application services directly.

## Module ownership

A domain module owns its schemas, business rules, services, data access, and UI feature components. Shared infrastructure owns cross-cutting mechanisms only.

## Dependency direction

- `app/` may depend on feature/application/shared UI.
- adapters may depend on application contracts.
- application may depend on domain and injected data ports.
- domain must not depend on Next.js, Hono, Vercel, Drizzle, MUI, or MCP.
- persistence adapters can depend on Drizzle/Neon.
- presentation code can depend on MUI/TanStack Query.

## Transaction boundaries

A user-visible mutation that changes multiple records and its audit event should normally be one database transaction.

Examples:

- create person + prospect + audit event;
- log outreach + update contact timestamps + audit event;
- log reply + update response depth + audit event.

Blob upload is not fully transactional with Postgres. Use staged states (`pending_upload`, `ready`, `failed`) and cleanup logic so orphaned metadata/blobs are detectable.

