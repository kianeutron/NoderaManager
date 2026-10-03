    # Integration Tests

    Integration tests cover:

- Drizzle queries against real Postgres-compatible behavior;
- transaction behavior;
- unique constraints/idempotency;
- Hono route validation/error mapping;
- Blob adapter behind a test double or isolated test store;
- MCP Streamable HTTP handler contract.

Avoid requiring Docker as the only developer path. Preferred future strategy is an isolated Neon branch/database for CI integration tests where free-plan limits allow it. Keep a lighter local fallback for agents/developers.

Never run integration tests against production.

Clean test data deterministically and make tests safe to rerun.

## Running database integration tests

Suites named `*.integration.test.ts` run only when `TEST_DATABASE_URL` is set and are skipped otherwise, so `pnpm test` stays hermetic. Point the variable at a throwaway Neon branch (create one from `production`, run the suite, delete the branch). The variable is deliberately separate from `DATABASE_URL` so a test can never pick up the production connection by accident.
