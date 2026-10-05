# Outreach Hub

Private, single-user client-acquisition workspace built as a Vercel-native modular monolith.

## Current slice

- dark, responsive overview dashboard based on the supplied Vision UI direction;
- strict TypeScript/MUI foundation with reusable dashboard primitives;
- server-only Neon Lakebase Postgres boundary and Drizzle schema for identity, prospects, outreach, routes, and immutable audit events;
- canonical identity normalization and duplicate-key tests;
- self-hosted Better Auth integration on Neon Postgres with an explicit owner allowlist and Google sign-in;
- protected duplicate-check API at `/api/people/duplicate-check` that reuses the same people service as MCP;
- a read-only, scope-gated Streamable HTTP MCP boundary with protected-resource discovery;
- baseline browser security headers and a no-store health endpoint at `/api/health`.

## Local development

1. Copy `.env.example` to `.env.local`, provide the Neon values, and set the allowlisted owner email.
2. Generate `BETTER_AUTH_SECRET` locally with `openssl rand -base64 48`. Do not commit or share it.
3. Configure Google OAuth credentials for the app origin and callback `/api/auth/callback/google`.
4. Run the forward-only auth migration in `src/shared/db/migrations/0008_better_auth_mcp.sql`, then the remaining database migrations.
5. Run `pnpm dev`.

The engineering contract and delivery roadmap are in [outreach-hub-engineering-guide](./outreach-hub-engineering-guide/README.md).
