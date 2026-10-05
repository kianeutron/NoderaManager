# Server and API Performance

The request path from the proxy to the response, and the rules for handlers, services, payloads and server-side caching. Database specifics are in `03-database.md`; network and platform in `02-infrastructure-and-network.md`.

## 1. The request path today

```
browser
  -> proxy.ts (pages only): CSP nonce + session check
  -> Next route: layout (cookies, headers) + page: session check again
  -> or /api/*: Hono -> request id -> same-origin check -> ownerOnly (session check)
       -> [rate limit: 1 database write]
       -> zod validation
       -> application service -> N statements -> response
```

Where the avoidable cost is:

- **Authentication runs up to three times per page view** (proxy, page, and every API call that the page then makes), and the auth object is rebuilt each time.
- **Rate limiting is a database write**, even for reads that are not security sensitive.
- **Services issue statements one after another** where they could run together or be merged.

## 2. Authentication cost

- The Neon Auth session is cached in a signed cookie (`sessionDataTtl`, default 5 minutes), so most checks verify a signature locally. After the cache expires the next request calls the auth server (in Frankfurt), and concurrent requests may each do so.
- **Create the auth object once per instance**, not per call: a lazily initialised module-level singleton in `shared/auth/dashboard-auth.ts`. It is configuration, not request state.
- **Resolve identity once per request.** The API already keeps the verified actor in the Hono context; pages must not resolve it again in every component. The page-level check stays (it protects the page), but nothing below it should repeat it.
- Do not widen the cookie cache TTL to hide latency: it delays revoking a session. Five minutes is the right trade for a single owner.
- Keep the proxy matcher narrow (it already skips `/api`, static assets and prefetches).

## 3. Handlers are adapters: keep them thin and parallel

(`AGENTS.md`: handlers validate, authorise, call a service, return.)

- A handler never loops over the database. If it needs several independent reads, the *service* issues them with `Promise.all`.
- Validation runs before any database work, and invalid input never reaches a query.
- Services take their repositories as arguments and create no clients inside; one `getDatabase()` per request is enough (it is cheap, it is only a client object, not a connection).
- Return the smallest object the screen needs (section 5). Do not return database rows.
- Errors are handled at the boundary only; do not add try/catch that logs and rethrows on the hot path.

## 4. Statement counts per operation

Targets (`00-overview-and-budgets.md`): reads 3 or fewer sequential, writes 4 or fewer, aggregates in parallel.

| Operation | Today | Target | How |
| --- | --- | --- | --- |
| List page (first) | search + count, in parallel | same | Already good |
| List page (next) | 1 | 1 | Keyset, no recount |
| Log outreach | 3 to 4 sequential (reads run together) | 3 | Independent reads already in one `Promise.all`; remaining: rate-limit upsert and prune, then one batch write |
| Overview | about 21, in parallel | 8 to 10 | Route, campaign and follow-up services expose one aggregate statement each |
| Analytics insights | 7 in parallel + rate limit write | 7 + 0 | In-memory read limit |

When the number of statements goes up in a pull request, the pull request says why (`07-checklists.md`).

## 5. Payload shaping

Smaller JSON is faster to produce, send and parse, and compression does not remove the CPU cost of serialising and parsing it.

- **Lists return summaries**, details load on open. A message list carries a 160 character preview, not the body; a campaign list carries counts, not members.
- **Select columns in SQL**, not in JavaScript after loading them.
- **Hard caps everywhere:** page limit 50, breakdown groups 50, awaiting-reply list 6, overdue follow-ups 5, windows up to 365 days.
- **Dates as ISO strings, ids as strings, numbers as numbers.** No nested copies of the same entity in one response: reference by id, or include it once.
- **Do not send what the UI recomputes** (labels, formatted dates, percentages); send the counts and let the client format.
- **Aggregates** return fixed-size arrays (53 weekly points, 168 send-time cells, 9 depth steps), never one element per underlying row.
- Response budget: lists 50 KB, aggregates 100 KB uncompressed. Check with `curl -s ... | wc -c`.
- **Never compress in the app** (`02-infrastructure-and-network.md`, section 3); set `Content-Type: application/json` and let the platform encode with Brotli or gzip.

## 6. HTTP caching for the API

Today every API response is `Cache-Control: no-store` and has no validator. For authenticated, per-owner data:

- Heavy GETs (overview, analytics, large lists) return `Cache-Control: private, no-cache` and a strong `ETag` (a hash of the serialised body). The browser revalidates with `If-None-Match`; an unchanged result is a `304` with no body.
- The statements still run on a revalidation (so correctness is unchanged); what is saved is transfer and `JSON.parse`. For skipping the work itself, use section 7.
- Mutations and auth responses stay `no-store`.
- Never add `public` or `s-maxage` to an authenticated route.

## 7. Server-side caching (skipping the work)

For an aggregate that is expensive and tolerates a few seconds of staleness:

| Layer | Use | Invalidation |
| --- | --- | --- |
| Per-instance memory cache (a `Map` with a short TTL, keyed by owner and query) | Overview and analytics results for 15 to 30 s | TTL, plus clear on any mutation handled by the same instance |
| Next.js `unstable_cache` / Cache Components (`use cache`) with a tag | Same data shared across instances | `revalidateTag` from the mutating service |

Rules:

- The key contains everything that changes the result (owner id, range, dimension, limit), never only a prefix.
- A cached value is never shared across users. There is one owner today; keep the key shape ready for more.
- A mutation that changes the figures invalidates or revalidates; a TTL alone is not enough for something the user just did ("I logged a message and the count did not move" is worse than a slow page).
- Caches are an optimisation after the statement count and region are right; do not add one first.

## 8. Rate limiting without waste

- Writes keep the database counter: it is atomic and shared across instances, and the audit trail depends on it.
- Reads that only protect against a runaway client use a per-instance in-memory counter (`rateLimited(policy, appliesTo, getMemoryRateLimiter)`): no database round trip, approximate across instances, and good enough for one owner. The analytics routes do this.
- Move expiry pruning off the request path: prune in the same statement as the upsert, or on a rare schedule (`13-maintenance/01-data-integrity-jobs.md`).
- A rate limit never costs more than the work it protects; if the check is slower than the handler, it is the wrong check.

## 9. Streaming and long work

- Anything slower than the budget is moved off the click: return quickly and let the UI poll or revalidate. There is no job queue in the zero-cost stack, so avoid designing features that need one.
- For pages, stream: render the shell first and let slower sections fill in inside `Suspense` (`05-client-and-rendering.md`).
- Keep function work under the plan's limits; a request that scans a large window should be narrowed (`03-database.md`), not given a longer timeout.

## 10. MCP

- MCP tools call the same services as the web API, so every rule here applies once.
- A tool call should be one service call, not a chain: `get_overview` and `get_analytics` already return everything a client needs in one request. Prefer a richer single tool over many small ones; each call from a client costs a full round trip plus authentication.
- Keep tool results bounded like API results; a model reading 500 KB of JSON is slow and expensive.
- The MCP rate limit is separate (`mcpPolicy`); do not stack the analytics limit on top of it.

## 11. Checklist for a new endpoint or tool

- [ ] Statements per request within budget; independent reads in `Promise.all`.
- [ ] Payload is a summary with hard caps; size checked.
- [ ] Heavy GET returns an `ETag`.
- [ ] No second authentication, no work at import time.
- [ ] Rate limit appropriate to the method (database counter for writes only).
- [ ] If cached: key includes everything that varies, and mutations invalidate it.
