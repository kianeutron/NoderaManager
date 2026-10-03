    # Outreach Hub Engineering Guide

    This documentation pack is the implementation contract for the personal Outreach Hub: a private dashboard, outreach CRM, strategy map, analytics workspace, and document library with a remote MCP endpoint so ChatGPT can safely read and log outreach activity.

## Read this first

The project is intentionally a **single deployable application**, not a microservice system. The web UI, typed API, MCP endpoint, domain services, database access, and file-library integration live in one repository and share the same business logic.

The core engineering priorities, in order, are:

1. Correctness and data integrity.
2. Security and privacy.
3. No duplicate business logic.
4. End-to-end type safety with runtime validation at every external boundary.
5. Reusable focused modules, components, hooks, schemas, and services.
6. Tests around business rules rather than tests that only mirror implementation details.
7. A clean UI based on the supplied Vision UI Dashboard design direction.
8. Fast delivery without creating architecture that becomes expensive to maintain.
9. Zero required monthly infrastructure spend while usage remains inside free-plan limits.
10. Easy migration away from any provider if free plans or requirements change.

## Target stack

- Next.js 16.3.x App Router, always on the latest security-patched 16.3 release available at installation time.
- React 19.
- TypeScript 6 with strictest practical compiler settings.
- Material UI 9 and Emotion.
- Hono for the internal HTTP API and its typed client.
- Zod 4 as the canonical runtime validation/schema layer.
- Neon Postgres for relational data.
- Drizzle ORM + Drizzle Kit for typed SQL and migrations.
- Vercel Blob, private store, for uploaded documents.
- Official MCP TypeScript SDK v2 using Streamable HTTP.
- TanStack Query for client-side server-state synchronization where interactive screens need it.
- React Hook Form + Zod resolver for non-trivial forms.
- Recharts for dashboard charts.
- @xyflow/react for strategy/relationship graphs.
- react-simple-maps plus bundled geographic data for the country map.
- Vitest + Testing Library for unit/component tests.
- Playwright for critical end-to-end flows.
- pnpm for package management.

## Important interpretation of “100% type safe”

No TypeScript application can make untrusted network or file input safe purely through static types. In this project, “type safe” means:

- `strict` TypeScript everywhere;
- no unchecked `any`;
- runtime validation of all external data with Zod;
- database types generated from one Drizzle schema;
- API request/response types derived from the same schemas;
- MCP tool schemas derived from the same schemas;
- exhaustive domain unions;
- no manual duplicate DTO definitions when a canonical schema already exists.

## Documentation map

Start with:

1. `AGENTS.md`
2. `PROMPT_FOR_GPT_WORK.md`
3. `docs/00-product/00-product-vision.md`
4. `docs/01-architecture/00-stack.md`
5. `docs/01-architecture/01-system-architecture.md`
6. `docs/01-architecture/02-repository-structure.md`
7. `docs/04-mcp/00-mcp-overview.md`
8. `docs/07-quality/00-coding-standards.md`
9. `docs/09-delivery/00-implementation-phases.md`

The ADR folder records architectural decisions so the coding agent does not repeatedly reopen settled questions.

