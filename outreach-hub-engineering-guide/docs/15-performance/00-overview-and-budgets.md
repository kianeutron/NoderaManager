# Performance: Overview and Budgets

This section is the engineering contract for speed. It covers the browser, the server and API, the database, the network between them, and how to measure all of it. Read it before changing anything that sits on the path of a click: routing, data loading, queries, styling that runs every frame.

| File | Scope |
| --- | --- |
| `00-overview-and-budgets.md` (this file) | Where time goes, the budgets, the rules everything else follows |
| `01-audit-findings.md` | What the app does today, with evidence, impact and a prioritised action plan |
| `02-infrastructure-and-network.md` | Region, Neon compute, CDN, compression, HTTP caching, cold starts |
| `03-database.md` | Transport, round trips, query rules, indexing playbook, EXPLAIN workflow |
| `04-server-and-api.md` | Request path, authentication cost, handlers, payloads, server caching |
| `05-client-and-rendering.md` | Rendering model, navigation, data fetching, bundles, CSS and animation |
| `06-measurement-and-monitoring.md` | Tools, budgets as tests, triage runbook |
| `07-checklists.md` | Pull request and release checklists |

Constraint that applies to every recommendation: the product runs on free plans (`08-deploy/02-zero-cost-guardrails.md`). A fix that needs a paid plan is listed as an option, never as the plan.

## Where the time goes on one click

A navigation or a data request is a chain. Every link is paid in sequence, so the slowest link and the number of links decide how fast it feels.

```
click
 -> server renders the new route        (auth check + render, in the function region)
 -> browser downloads and parses JS     (bundle size, CPU)
 -> React hydrates                      (client components, main thread)
 -> client fetches data                 (API request: auth check + N database round trips)
 -> render the result                   (components, styles, GPU compositing)
```

The two multipliers that matter most in this architecture:

1. **Distance.** The database speaks HTTP (`neon-http`), so *every SQL statement is one network round trip* from the function to Neon. A request with seven statements pays seven round trips. If the function and the database are on different continents, each round trip costs roughly 65 to 150 ms; in the same region it costs 1 to 10 ms.
2. **The main thread and the GPU.** A dashboard that animates a full-screen shader and blurs a dozen translucent panels over it spends the frame budget on pixels, so clicks and scrolling queue behind painting.

## Budgets

Budgets are limits a change must stay inside. They are deliberately conservative for a single-user tool so that a regression is visible.

### Experience (field, 75th percentile)

| Metric | Good | Applies to |
| --- | --- | --- |
| LCP (largest contentful paint) | 2.5 s or less | Every page, first visit |
| INP (interaction to next paint) | 200 ms or less | Every click, type, toggle |
| CLS (layout shift) | 0.1 or less | Every page |

### Navigation and data

| Budget | Target |
| --- | --- |
| Client navigation: something useful on screen after the click | under 100 ms (skeleton counts) |
| Client navigation: real content | under 500 ms warm, under 1.5 s cold |
| Read API, warm | p95 under 300 ms |
| Write API, warm | p95 under 500 ms |
| Database statements per request | reads: 3 or fewer sequential; writes: 4 or fewer sequential |
| Aggregate endpoints (overview, analytics) | p95 under 800 ms warm, statements run in parallel |

### Bytes

| Budget | Target |
| --- | --- |
| First-load JavaScript per route (gzip) | 200 KB or less for dashboard routes; 120 KB or less for sign-in |
| Any single lazy chunk (gzip) | 60 KB or less unless it is a charting or editor library behind an interaction or a Suspense boundary |
| JSON response (uncompressed) | list page 50 KB or less; aggregate 100 KB or less |
| Rows returned by a list | at most the page limit; never unbounded |

### Frames

| Budget | Target |
| --- | --- |
| Decorative animation | must be able to run at 30 fps or lower, pause when hidden, offscreen or while scrolling, and be off for reduced motion |
| Translucent blurred layers visible at once | 3 or fewer; the rest use a flat translucent fill |

## Rules everything else follows

1. **Fewer, closer round trips beat faster queries.** First put compute and database in one region, then cut the number of sequential statements, then tune the statements.
2. **Never block the first paint on data.** Show structure at once (layout, skeleton) and stream or fetch the rest.
3. **Do work once.** One authentication per request, one clock, one data fetch per question, shared between the page and its panels.
4. **Everything unbounded is a bug.** Lists are paged, aggregates are windowed, payloads are capped, groups have a limit.
5. **Pay for code only when it is used.** Charting, WebGL, editors and form libraries load when needed.
6. **Decoration is optional and cheap.** Visual effects degrade (reduced motion, low power, small screens) and never run while hidden.
7. **Measure before and after.** A performance change without a number is a guess (`06-measurement-and-monitoring.md`).
8. **Keep the budgets as tests where possible** (bundle size, statement count) so they cannot rot.

## Sources used for this section

- Next.js 16 docs shipped in `node_modules/next/dist/docs`: production checklist, instant navigation, prefetching, lazy loading, `optimizePackageImports`, `compress`, `staleTimes`, `reactCompiler`, bundle analyzer.
- [Vercel regions](https://vercel.com/docs/regions) and [Vercel CDN compression](https://vercel.com/docs/how-vercel-cdn-works/compression).
- [Neon: choosing a connection method](https://neon.com/docs/connect/choose-connection), [connection latency and timeouts](https://neon.com/docs/connect/connection-latency), [scale to zero](https://neon.com/docs/guides/scale-to-zero-guide).
- [TanStack Query: advanced server rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr).
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html).
- Core Web Vitals thresholds (LCP 2.5 s, INP 200 ms, CLS 0.1 at the 75th percentile).
