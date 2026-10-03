    # Instructions for Coding Agents

    This file is authoritative for any coding agent working in this repository.

## Operating rule

Before changing code, identify the owning module and existing reusable code. Do not create a new helper, schema, hook, component, repository, or service until you have searched for an existing one that already owns the responsibility.

## Non-negotiable rules

- Never duplicate business logic between UI, REST/Hono API, MCP tools, imports, cron jobs, or tests.
- Route handlers and MCP tool handlers are adapters. They validate/authorize, call an application service, map the result, and return. They do not contain business rules.
- The same application service must be callable from the web API and MCP.
- One canonical Zod schema should normally define a concept's runtime validation. Derive TypeScript types with `z.infer`.
- The Drizzle schema is the canonical database shape. Do not maintain hand-written database row interfaces.
- Use domain-specific value types/unions for statuses and categories. Never scatter raw strings such as `"warm"`, `"email"`, or `"recruiter"` across the codebase.
- Do not use `any`. If a library returns `unknown`, validate or narrow it.
- Do not use non-null assertions (`!`) to silence errors unless an invariant is proven immediately next to the assertion and a comment explains it.
- Do not catch an error merely to log and rethrow it. Errors are handled at boundaries.
- Do not create generic `utils.ts`, `helpers.ts`, or `common.ts` dumping grounds.
- Do not create “god” components, “god” services, or files that own unrelated responsibilities.
- Do not introduce a dependency if a small, well-tested function can do the job safely.
- Do not reimplement security-sensitive primitives such as cryptography, token parsing, password hashing, OAuth, or file-type parsing.
- Do not expose database objects directly through public API/MCP contracts.
- No destructive MCP tools in the initial release.
- Every data mutation writes an audit event.
- Duplicate detection happens before creating people and organizations.
- Every migration must be forward-only, reviewed, and reproducible.

## Required workflow for every task

1. Read the closest relevant documentation under `docs/`.
2. Locate the owning feature/module.
3. Search for existing schemas/services/components.
4. State the intended change and affected boundaries.
5. Implement the smallest coherent change.
6. Add or update tests for behavior.
7. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and relevant Playwright tests.
8. Check accessibility and loading/error/empty states for UI changes.
9. Check audit logging, auth, validation, and idempotency for mutations.
10. Update docs/ADR only if the architecture or contract changed.

## Stop conditions

Stop and ask for a decision instead of guessing when:

- a change requires a new paid service;
- a change weakens authentication or MCP authorization;
- a migration would delete or irreversibly rewrite stored data;
- a new dependency significantly duplicates an existing dependency;
- the requested behavior conflicts with an ADR;
- external provider limits or APIs have changed materially;
- the task would require storing secrets or tokens in client-side code.

## Code review standard

A change is not complete merely because it runs. It must have clear ownership, tests at the correct layer, no duplicated rules, typed boundaries, explicit failure behavior, and no security regression.

