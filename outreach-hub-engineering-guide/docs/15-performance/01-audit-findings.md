# Performance Audit: Findings and Action Plan

Audit of the deployed app (October 2026). Each finding has evidence from the repository or a measurement, what it costs, the fix, and how to confirm the fix. **Verified** means measured or read directly from the code or provider; **Unverified** means a strong inference that must be checked first (the step to check it is given).

The Vercel project could not be inspected from the audit environment, so anything that depends on the project settings is marked Unverified.

## Summary

The slowness has four compounding causes, in order of expected impact:

1. **Distance between the function and the database** (Unverified, very likely): every SQL statement is a network round trip, and a Vercel project that has not been pinned to a region runs in Washington, D.C. while the Neon database is in Frankfurt.
2. **Continuous GPU work behind every page**: a full-screen WebGL shader at the display refresh rate plus up to about twenty blurred translucent panels over it.
3. **Navigation does the maximum amount of work**: every route is fully dynamic, the app shell is rebuilt on every page change, there is no loading UI, and data is only requested after the page has hydrated.
4. **Too much JavaScript on the first load**: 311 to 417 KB (gzip) per dashboard route against a 200 KB budget, including two WebGL libraries nobody is using on a given page.

## Findings

Severity: **P0** do first, **P1** next, **P2** when the cheaper wins are done, **P3** only if measurements still demand it.

### Infrastructure and network

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| I1 | Function region not pinned; database is in `aws-eu-central-1` | Neon project region `aws-eu-central-1` (verified). No `vercel.json`, no `regions` anywhere in the repo (verified). Vercel's default function region is `iad1` (documented). | **P0**, Unverified until `x-vercel-id` is read |
| I2 | Database sleeps after 5 minutes idle | Compute `suspended_at` 5.5 minutes after `last_active` (verified). Free plan: fixed 5 minute timeout, cannot be disabled (documented). Typical wake time is 0.3 to 0.8 s, sometimes more. | P1 (mitigate, cannot remove on the free plan) |
| I3 | Database compute is the minimum size | `autoscaling_limit_min_cu` 0.25, max 2 (verified). After a wake the buffer cache is cold, so the first queries are slower still. | P3 |
| I4 | API responses are uncacheable | Every API response sets `Cache-Control: no-store` and no `ETag` (verified in the routers). Compression is applied by Vercel's CDN automatically when the client sends `Accept-Encoding` (documented); confirm with `Content-Encoding` on a real response. | P2 |
| I5 | One function serves every API route | Single catch-all `app/api/[[...route]]/route.ts` imports all eleven routers and their services (verified). Server chunks are 59 MB on disk. Fluid compute with bytecode caching reduces the cold-start cost (documented). | P3 |

### Database

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| D1 | Every statement is an HTTPS round trip | `drizzle-orm/neon-http` in `shared/db/client.ts` (verified). `neon-http` is best for single, non-interactive queries; a pooled connection is faster for many statements in one request (documented). | P1 once I1 is fixed |
| D2 | Writes make 5 to 7 sequential round trips | `logOutreach`: rate-limit upsert, optional prune, target lookup, idempotency lookup, duplicate lookup, optional membership lookup, then one batch insert (verified in `log-outreach.service.ts` and `rate-limit.repository.ts`). | P1 |
| D3 | The overview issues about 21 statements | `getOverview` runs 11 parallel reads; the follow-up, route and campaign services each run 2 to 4 statements of their own (counted from the code). They run in parallel, so latency is the slowest chain, but each is a separate HTTPS call and a separate billable compute wake-up. | P1 |
| D4 | Rate limiting costs a database write on every analytics read | `analyticsReadPolicy` applies to all methods (I added it, verified). It is one `INSERT ... ON CONFLICT` per request before any real work. | P1 |
| D5 | Index coverage matches the current list queries; a few aggregates have no supporting index | Keyset lists have partial composite indexes (verified in `schema/core.ts`). Gaps: `outreach_messages.route_id` and `.reply_status`, `interactions.occurred_at`, a composite `(sent_at, id)` for the message list (already noted in the outreach docs). With a few thousand rows a sequential scan is as fast as an index, so these are **not** to be added now; see `03-database.md` for the thresholds. | P2 |

### Server and API

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| S1 | Authentication object is rebuilt on every call | `getDashboardAuth()` calls `createNeonAuth(...)` each time; it runs in the proxy, in every page, and in every API request (verified). The session itself is cached in a signed cookie for 5 minutes by default (documented), so most checks are local, but after expiry each concurrent request may call the auth server. | P2 |
| S2 | Aggregate endpoints are recomputed on every open | `useOverview` and `useInsights` use `staleTime` 0 on purpose so figures never lag (verified). Each open therefore costs the full set of statements. | P1 |
| S3 | No server-side prefetch | Pages are server components that render a client page; all data is fetched by the browser after hydration (verified). | P1 |

### Client and rendering

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| C1 | Full-screen WebGL shader runs continuously | `Topography.tsx` (default) draws a WebGL2 fragment shader over the whole viewport on every animation frame, DPR up to 1.5, no frame-rate cap (verified). It does pause when hidden or offscreen and for reduced motion. `Ferrofluid` does not cap DPR at all. | **P0** |
| C2 | Blur over an animated background, on many layers | `GlassPanel` uses `backdrop-filter: blur(24px) saturate(145%)` and a page has up to about 20 panels, plus the sidebar and mobile bar (verified). Blur is the most expensive filter; with a moving background everything behind each layer is re-blurred every frame (documented). Reports show several milliseconds of GPU time per frame per blurred layer on mid-range devices. | **P0** |
| C3 | The app shell is rebuilt on every navigation | `AppShell` is rendered inside each of 6 page components, not in a layout. There is no `layout.tsx` besides the root and no route group (verified). Its collapsed state resets on every navigation. | **P0** |
| C4 | No loading UI | No `loading.tsx` anywhere, no `Suspense` around page content (verified). The click gives no feedback until the server answers. | **P0** |
| C5 | Every route is fully dynamic | Root layout sets `dynamic = "force-dynamic"` and reads `cookies()` and `headers()` for the theme and the CSP nonce (verified). There is no static shell to show instantly. A nonce-based CSP requires dynamic rendering, so this is a deliberate trade-off to revisit only with Cache Components. | P2 |
| C6 | Bundles are above budget | First-load JS (gzip): `/` 417 KB, `/analytics` 362 KB, `/people` 313 KB, `/outreach` 311 KB, `/routes` 308 KB, `/library` 269 KB, `/auth/sign-in` 211 KB. All client chunks: 2.97 MB raw, 0.87 MB gzip (measured from the production build). | **P1** |
| C7 | Libraries load whether or not they are used | `BackgroundCanvas` imports the Ferrofluid, Plasma and Topography components statically, so the WebGL library (about 150 KB raw) ships to every route, including sign-in. Recharts (387 KB raw, 113 KB gzip) ships in the shared chunk set. No `next/dynamic` or `React.lazy` anywhere (verified). | **P1** |
| C8 | 72 percent of components are client components | 119 of 166 component files are marked `"use client"` (counted). Acceptable for an interactive dashboard, but it means no content is server-rendered. | P2 |
| C9 | Styling runs at render time | MUI with Emotion; `sx` objects and theme callbacks on hot components (verified). A thousand `sx` elements cost roughly 100 ms more than static styles (documented benchmark). Lists are paged, so this is a small factor next to C1 and C2. | P3 |

## Status of the code-side fixes

Implemented after the audit (the region, Neon wake-ups and Vercel settings are not code and are untouched). Measured with `pnpm build` then `pnpm size`.

| Finding | Done | Result |
| --- | --- | --- |
| C1 WebGL shader at full rate | Default background is now `Still` (a painted gradient). The animated ones are opt-in, loaded only when selected, drawn at most 30 times a second, at device pixel ratio 1, and paused while scrolling (`shared/ui/backgrounds/frame-gate.ts`) | No GPU work at idle by default. Someone who had already picked an animation keeps it, cheaper |
| C2 Blur everywhere | `GlassPanel` is a flat translucent fill unless `blur` is passed; blur is 12 px at most and only on the sidebar, the mobile bar, the overview banner and tooltips; it switches off for `prefers-reduced-transparency` and on small screens (`shared/ui/glass.ts`) | From up to about 20 blurred layers at 24 px to 3 at 12 px |
| C3 Shell rebuilt on every navigation | Pages moved into the `app/(dashboard)/` route group; `layout.tsx` renders `AppShell` once; the six pages no longer wrap themselves | The shell and its state survive navigation |
| C4 No loading UI | `app/(dashboard)/loading.tsx` (a page-shaped skeleton) | A click shows structure immediately |
| C7 Libraries loaded unused | WebGL backgrounds and the Recharts panels load with `next/dynamic` (`lazy-charts.tsx`, `BackgroundCanvas`) | See the table below |
| S3 / D3 data only after hydration | The overview and analytics pages fetch on the server in parallel and hydrate (`PrefetchedQueries`) | No hydrate-then-fetch wait for the first screen; the browser reuses the data for 30 s |
| S2 recompute on every open | Overview and analytics are cached 30 s on the client, and every successful write marks them stale (`liveFiguresKey`, `createQueryClient`) | Figures are never older than the last write |
| D4 rate-limit write on reads | Analytics reads use an in-memory limiter per instance (`createMemoryRateLimiter`); writes keep the database counter | One database round trip fewer per analytics read |
| I4 uncacheable API | Analytics responses are `private, no-cache` with an ETag and answer `If-None-Match` with 304 (`hono/etag`) | Unchanged results travel as headers only |
| D2 sequential lookups on write | `logOutreach` runs its independent reads (prospect, idempotency key or duplicate, campaign membership) in one `Promise.all` | 3 or 4 round trips become 1, so a write is 3 to 4 sequential statements, down from 5 to 7 |

First-load JavaScript, gzip, measured from the production build:

| Route | Before | After | Budget |
| --- | --- | --- | --- |
| `/auth/sign-in` | 211 KB | 117 KB | 120 KB, met |
| `/` | 417 KB | 302 KB | 200 KB |
| `/analytics` | 362 KB | 254 KB | 200 KB |
| `/people` | 313 KB | 310 KB | 200 KB |
| `/outreach` | 311 KB | 308 KB | 200 KB |
| `/routes` | 308 KB | 305 KB | 200 KB |
| `/library` | 269 KB | 267 KB | 200 KB |

Still open, in order:

1. **One 95 KB (gzip) chunk of the validation library (zod) loads on every dashboard route.** It is used by the URL-state codecs, form resolvers and shared schemas. Options: `zod/mini`, or plain parsing for the small URL codecs and loading form schemas only with their dialogs. Attribute it precisely with `npx next experimental-analyze` first.
2. MUI and Emotion are the next largest share; keep dialogs and heavy panels behind `next/dynamic`.
3. S1 (the authentication object is rebuilt per call) was left alone because the authentication code is being replaced separately.
4. Region (I1), Neon wake-ups (I2) and the other items marked P3.
5. Run `pnpm size` after each build; it fails while a route is over budget.

## Action plan

Ordered by expected gain per hour of work. Each step ends with the check that proves it worked.

### Step 1: pin the region (P0, about 15 minutes)

1. Read the current region: request any URL of the deployed app and look at the `x-vercel-id` response header (`edge::function::id`). If the function region is `iad1`, this is the main problem.
2. Set Project, Settings, Functions, Function Region to **Frankfurt (fra1)** to match the Neon region, or commit `vercel.json` with `{ "regions": ["fra1"] }`.
3. Redeploy and compare p50 and p95 of one list request and one write before and after (`06-measurement-and-monitoring.md`).

### Step 2: make the decoration cheap (P0, about half a day)

1. Default background becomes **static** (CSS gradient or a single frame). WebGL backgrounds become an opt-in setting.
2. Load a background component only when it is selected (`next/dynamic`, `ssr: false`), so the WebGL library leaves the shared bundle.
3. When a WebGL background is on: cap to 30 fps, cap DPR at 1, render at a reduced scale, and pause while the user scrolls and while the tab is hidden.
4. Reduce blur to at most 12 px, and apply `backdrop-filter` only to the shell, the hero and dialogs. Other panels get a flat translucent fill. Turn blur off for `prefers-reduced-transparency`, `prefers-reduced-motion` and narrow screens.

### Step 3: stop rebuilding the shell, give clicks instant feedback (P0, about half a day)

1. Move the pages into a route group `app/(dashboard)/` with a `layout.tsx` that renders `AppShell` once. Pages stop wrapping themselves.
2. Add `loading.tsx` for each route (skeleton that matches the page). Navigation then shows structure immediately, and only the page segment re-renders.
3. Lift `collapsed` navigation state so it survives navigation (it will, once the shell is in a layout).

### Step 4: shrink the first load (P1, about one day)

1. Lazy load Recharts panels, dialogs with forms (react-hook-form and zod), and the library page's heavy parts with `next/dynamic`.
2. Run `npx next experimental-analyze`, find what the shared chunks contain, and keep server-only schemas out of client bundles.
3. Re-run the production build and compare each route against the 200 KB budget.

### Step 5: fewer, shorter data trips (P1, about one to two days)

1. Prefetch the first screen on the server and hydrate it (`prefetchQuery` in the server component, `HydrationBoundary` around the client page) for the overview, people, outreach and routes screens. This removes the hydrate-then-fetch waterfall.
2. Cut write round trips: merge the target, idempotency and duplicate lookups into one statement or one `database.batch` read, and drop the rate-limit prune from the hot path.
3. Overview and analytics: raise `staleTime` to 30 to 60 s and invalidate on the mutations that change the figures; or cache the result on the server for a short, per-owner window.
4. Count rate-limit reads in memory per instance (reads are not security sensitive for a single owner) and keep the database counter for writes only.

### Step 6: cheaper repeat work (P2)

1. ETag and `304` for heavy GET responses.
2. Singleton authentication object per instance.
3. Cache Components and partial prefetching (`cacheComponents`, `partialPrefetching`) for instant navigation once Steps 1 to 5 are done.
4. React Compiler (`reactCompiler: true`) and list virtualisation if a list ever renders hundreds of rows.
5. Add the indexes in `03-database.md` when a table crosses its threshold.

### Step 7: only if still slow (P3)

Switch the database transport to a pooled TCP connection (`pg` with Vercel Fluid pooling) if round trips still dominate after Step 1; or move to a paid Neon plan to disable scale to zero.

## Expected result (honest estimate)

These are expectations, not promises; measure each step.

- Step 1 alone should remove most of the per-statement delay if the region was wrong: a write of 6 statements moves from several hundred milliseconds of pure waiting to well under 100 ms.
- Steps 2 and 3 are what the eye sees: no frame drops while scrolling, instant feedback on click, no flashing sidebar.
- Steps 4 and 5 bring first-load JS under budget and remove the loading waterfall on first paint.
