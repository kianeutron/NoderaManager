# Performance Checklists

Short, tickable lists. The reasoning behind each item is in the file named in brackets.

## Pull request

For any change to a screen, an endpoint, a query or a dependency.

**Always**
- [ ] State what the change costs or saves, with a number when it touches a hot path (`06-measurement-and-monitoring.md`).
- [ ] No new dependency without checking its size and whether a small function would do (`05-client-and-rendering.md`).

**Database or service**
- [ ] Sequential statements per request within budget: reads 3 or fewer, writes 4 or fewer, independent reads in `Promise.all` (`03-database.md`).
- [ ] Selects only the columns it needs; has a hard bound on rows, window and groups.
- [ ] No query in a loop, no unqualified column in a correlated subquery.
- [ ] A new index only with a measured reason, forward-only migration, tested on a branch.
- [ ] A test pins the statement count if the path is hot.

**Endpoint or tool**
- [ ] Payload is a summary with caps; size checked against the budget (`04-server-and-api.md`).
- [ ] Authentication happens once; no work at import time.
- [ ] Heavy GET has an `ETag`; authenticated responses are never `public`.
- [ ] Rate limit matches the method; the database counter only for writes.

**Screen or component**
- [ ] Rendered inside the shared layout; has loading UI of the right size (`05-client-and-rendering.md`).
- [ ] `"use client"` only where needed; first-screen data prefetched on the server where it matters.
- [ ] Query keys, `staleTime` and invalidation chosen on purpose.
- [ ] Heavy libraries and form dialogs loaded on demand; first-load size within budget.
- [ ] At most one blurred layer added; animation uses transform and opacity and respects reduced motion.
- [ ] Interactions under 200 ms in the Performance panel; long lists virtualised.

## Release

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass.
- [ ] First-load JavaScript per route is within budget (sign-in 120 KB, others 200 KB gzip).
- [ ] `x-vercel-id` shows the function in the database's region (`02-infrastructure-and-network.md`).
- [ ] A static asset is served with Brotli and an immutable cache header.
- [ ] The baseline scenarios are within budget (`06-measurement-and-monitoring.md`, section 1).
- [ ] No migration blocks writes; any new index was created appropriately for the table size.

## Monthly

- [ ] `pg_stat_statements`: the ten most expensive statements are understood.
- [ ] `idx_scan = 0` indexes reviewed; gaps in `03-database.md` section 4 re-checked against table sizes.
- [ ] Field Web Vitals (75th percentile) against `00-overview-and-budgets.md`.
- [ ] Unused dependencies removed; bundle analyser looked at once.
- [ ] Provider terms and limits re-read (Vercel Hobby, Neon Free); nothing in the docs depends on a specific quota number.
