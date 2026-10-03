# Outreach Hub

Private, single-user client-acquisition workspace built as a Vercel-native modular monolith.

## Current slice

- dark, responsive overview dashboard based on the supplied Vision UI direction;
- strict TypeScript/MUI foundation with reusable dashboard primitives;
- server-only Neon Lakebase Postgres boundary and Drizzle schema for identity, prospects, outreach, routes, and immutable audit events;
- canonical identity normalization and duplicate-key tests;
- Neon Auth integration with an explicit owner allowlist and Google sign-in;
- protected duplicate-check API at `/api/people/duplicate-check` that reuses the same people service as MCP;
- a read-only, scope-gated Streamable HTTP MCP boundary with protected-resource discovery;
- baseline browser security headers and a no-store health endpoint at `/api/health`.

## Local development

1. Copy `.env.example` to `.env.local`, provide the Neon values, and set the allowlisted owner email.
2. Generate `NEON_AUTH_COOKIE_SECRET` locally with `openssl rand -base64 48`. Do not commit or share it.
3. For the remote MCP endpoint, configure a real OAuth authorization server and provide every `MCP_*` value. The endpoint returns no data until that is complete.
4. Run `pnpm db:generate` and `pnpm db:migrate` after linking the intended Neon project.
5. Run `pnpm dev`.

The engineering contract and delivery roadmap are in [outreach-hub-engineering-guide](./outreach-hub-engineering-guide/README.md).
