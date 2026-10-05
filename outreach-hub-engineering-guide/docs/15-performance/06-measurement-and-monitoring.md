# Measurement and Monitoring

A performance change without a number is a guess. This file says what to measure, with which tool, how to keep the budgets from rotting, and how to find the cause when something feels slow.

## 1. Baseline protocol

Run the same scenarios before and after every performance change and record p50 and p95 over at least 10 runs (more for p95). Use a fixed environment: the production build (`next build` then `next start`, or the deployed app), a throttled laptop profile (CPU 4x slowdown, Fast 4G) for the browser, and a signed-in session.

| Scenario | What it shows |
| --- | --- |
| Cold first load of `/` after 10 minutes idle | Database wake-up, server render, bundle download, hydration |
| Warm first load of `/people` | Server render and bundle without the wake-up |
| Client navigation `/` to `/people`, `/people` to `/outreach` | Shell reuse, loading UI, data waterfall |
| Open a record in the preview panel | Detail query and render |
| Apply a filter or type in search | INP and list refetch |
| Log an outreach message | Write path: statements, rate limit, invalidation |
| Open Overview, open Analytics | Aggregate endpoints |

Record: time to first feedback (skeleton), time to content, number of requests, bytes transferred, number of database statements. Keep the table in the pull request that changes performance.

## 2. Where to look first (cheap checks)

1. **Region.** `curl -sI https://<app>/ | grep -i x-vercel-id`. The middle region must be the database region (`fra1`). If not, fix `02-infrastructure-and-network.md` first; nothing else will matter as much.
2. **Compression.** `curl -sI -H 'Accept-Encoding: br' https://<app>/_next/static/chunks/<file>.js` shows `content-encoding: br`.
3. **Payload sizes.** Network panel: transferred versus resource size per API call.
4. **CPU and GPU at idle.** Open the app, touch nothing, watch Activity Monitor or the Chrome task manager. A page that keeps a core busy while idle is animating (`05-client-and-rendering.md`, section 6).

## 3. Server timing

Make the server tell you where the time went, so you do not infer it.

- Add a small Hono middleware (once, in `shared/api`) that measures the handler and adds `Server-Timing: app;dur=<ms>, db;dur=<ms>;desc="<n> statements"`. Collect the database part with a Drizzle `logger` that counts statements and sums time per request (an `AsyncLocalStorage` per request).
- Chrome DevTools, Network, Timing shows `Server-Timing` entries directly; no extra tooling.
- Gate by environment if the numbers are sensitive; statement counts and durations are not.
- Use the same counter in integration tests to pin statements per operation (`03-database.md`, section 2).

## 4. Browser tools

| Tool | Use |
| --- | --- |
| Chrome DevTools, Performance | Record a navigation or interaction. Look for long tasks (over 50 ms), scripting versus rendering versus painting time, and the GPU lane. Compare with and without the background (a static background first, then the WebGL one) to see its cost |
| DevTools, Rendering | Paint flashing, layer borders, FPS meter: shows what repaints every frame |
| Lighthouse (incognito, mobile profile) | Lab LCP, CLS, total blocking time, unused JavaScript, main-thread work. A simulated test: pair it with field data |
| React DevTools Profiler | Why a component rendered and how long it took |
| `npx next experimental-analyze` (Next.js 16.1 or later) | Bundle module graph with import tracing: what is in each chunk and why |
| `next build` output plus the per-route first-load script below | Size budgets |

## 5. Field metrics (what real use feels like)

- `useReportWebVitals` (Next.js) reports LCP, INP, CLS, FCP and TTFB from the real browser.
- Zero-cost options: log them to the console during a measurement session; or send them to a tiny rate-limited route that keeps aggregate counts; or use Vercel Speed Insights if the current Hobby allowance covers it (check the plan; do not rely on a quota number).
- Judge at the 75th percentile, over several days of use, not a single run.

## 6. Database tools

- `EXPLAIN (ANALYZE, BUFFERS)` on a branch with realistic volume (`03-database.md`, section 5).
- `pg_stat_statements`: top statements by total time and by mean time.
- `pg_stat_user_indexes`: indexes never scanned (`idx_scan = 0`) and `pg_stat_user_tables.seq_scan` for tables read by sequential scan.
- Neon console monitoring: active time, compute size, cache hit ratio.
- To test volume: create a throwaway branch and seed it, for example `INSERT INTO ... SELECT ... FROM generate_series(1, 200000)`, run `ANALYZE`, then test. Delete the branch afterwards (ask first, as for every branch).

## 7. Budgets as automated checks

Budgets that nobody checks are decoration. Keep these in CI or in the release script.

**First-load JavaScript per route.** `pnpm size` (`scripts/check-bundle-budget.mjs`) reads each route's client reference manifest after `pnpm build`, sums the gzip size of its chunks, prints it, and fails when a route is over budget (sign-in 120 KB, others 200 KB). How it works:

```ts
// scripts/check-bundle-budget.mjs
// for each .next/server/app/**/page_client-reference-manifest.js:
//   collect "static/chunks/*.js" files, gzip them, sum
//   fail when route "/auth/sign-in" > 120 KB or any other route > 200 KB
```

**Statements per operation.** Integration tests assert an upper bound on the statements a service issues (`03-database.md`).

**Payload size.** Integration or route tests assert a serialised response stays under its budget for a seeded dataset.

**Lighthouse CI** (optional) on the sign-in page, which needs no login, with budgets for LCP, total blocking time and JavaScript size.

## 8. Load checks

There is one user, so sustained load is not the risk; concurrency inside one request is (a page that fires 20 statements). Check that with a few parallel requests against a local production build on a seeded Neon branch, never against production:

```bash
autocannon -c 4 -d 20 -H 'cookie: <session>' http://localhost:3000/api/analytics/overview
```

Watch p95 and the statement count, not the throughput.

## 9. Triage runbook: "it feels slow"

1. **Slow only on the first click after a quiet spell?** The database was asleep (`02-infrastructure-and-network.md`, section 2). Expected on the free plan; confirm the skeleton shows.
2. **Slow on every navigation, including the sidebar?** Read `x-vercel-id` (region). Then read `Server-Timing`: a large `db` share means round trips or distance; a large `app` share with a small `db` means server render or auth.
3. **UI stutters while scrolling or typing, even with no network?** GPU or main-thread cost. Turn the background to static and check again; then look at blurred layers (`05-client-and-rendering.md`, section 6).
4. **Content is late but the server answered quickly?** Large JavaScript or a waterfall. Check first-load size and whether data is fetched after hydration.
5. **Only writes are slow?** Count statements (`Server-Timing`); look for the rate limit upsert and sequential lookups (`04-server-and-api.md`, section 4).
6. **One list or report is slow?** `EXPLAIN (ANALYZE, BUFFERS)` the statement on a seeded branch.
7. **Slow after a deploy?** Compare the first-load size per route and the statement counts with the previous build.

Record the cause and the fix in the pull request; patterns repeat.

## 10. Cadence

- Every pull request: the checklist in `07-checklists.md`.
- Every release: the bundle budget check, `x-vercel-id`, and a pass of the baseline scenarios.
- Monthly: `pg_stat_statements` top ten, unused indexes, and the slowest scenario from the field metrics.
