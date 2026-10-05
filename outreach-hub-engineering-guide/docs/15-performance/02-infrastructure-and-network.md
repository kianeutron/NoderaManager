# Infrastructure and Network

Everything between the browser and the database: where code runs, how bytes travel, what is cached, and what a cold start costs. Findings referenced here are in `01-audit-findings.md`.

## 1. Run compute next to the data

The database speaks HTTP, so each statement is a round trip from the function to Neon. Distance is therefore the largest single multiplier.

- The Neon project is in `aws-eu-central-1` (Frankfurt).
- Vercel functions default to `iad1` (Washington, D.C.) unless the project says otherwise. Published reports of this exact mismatch (function in `iad1`, database in `eu-central-1`) show roughly 65 to 150 ms per statement across the Atlantic, against 1 to 3 ms when both are in the same region.
- **Rule:** the function region is the database region. Set it in Project, Settings, Functions, Function Region, or in `vercel.json`:

```json
{ "regions": ["fra1"] }
```

- **Verify:** every Vercel response carries `x-vercel-id` in the form `edge-region::function-region::id`. The middle part must read `fra1`. Check it after each deploy that touches infrastructure.
- If the database region ever changes, the function region changes with it. Record both in `08-deploy/00-vercel-deployment.md`.
- Only one region is needed: the app has one user. Multi-region would put function copies far from the single database and make things slower.

## 2. Neon compute behaviour

| Fact | Consequence |
| --- | --- |
| The Free plan suspends the compute after 5 minutes without activity, and this cannot be disabled | The first request after a pause pays a wake-up of typically 0.3 to 0.8 s, sometimes 2 to 3 s |
| Minimum compute is 0.25 CU | After a wake the cache is cold; the first queries read from storage |
| The pooled host (`-pooler`) goes through PgBouncer | It does not matter for the HTTP driver; it matters only if the transport changes to TCP (`03-database.md`) |

What to do within the zero-cost rules:

1. **Hide it, do not fight it.** The first navigation after idle should show a skeleton, not a blank wait (`05-client-and-rendering.md`). Treat a slow first request after 5 minutes as expected, not as a bug.
2. **Warm on intent, not on a timer.** When the sign-in page loads, or the app opens after a long gap, fire one cheap request (`select 1`) in the background so the compute wakes while the user is still typing. Do not add a cron keep-alive: it would burn compute allowance and the guardrails forbid high-frequency jobs.
3. **Do not size up.** Autoscaling already goes to 2 CU under load; a single user never needs it.
4. If the sluggish first request is unacceptable, the only real fix is a paid plan that allows disabling scale to zero. That is a product decision (`AGENTS.md` stop conditions), not an engineering default.

## 3. Compression

Text compresses well; JSON and JavaScript shrink by roughly 70 to 90 percent.

- **Vercel compresses at the CDN.** When the request has `Accept-Encoding`, Vercel compresses compressible content types (HTML, CSS, JavaScript, JSON, SVG and similar) with Brotli, falling back to gzip. Brotli is typically 14 to 21 percent smaller than gzip for web assets. This applies to function responses and static files.
- **Do not compress in the application.** No gzip middleware in Hono and no pre-compressed bodies; double encoding or a wrong `Content-Encoding` breaks clients and wastes CPU. Return `Content-Type: application/json` and let the platform encode.
- **Verify** once per release: `curl -sI -H 'Accept-Encoding: br' https://<app>/<static-asset>` shows `content-encoding: br`. For API responses, check the same header in the browser's network panel on a signed-in session.
- **Next.js self-hosting** (not used on Vercel) compresses with gzip by default via `compress`; leave it on unless another layer compresses.
- **Compression does not replace shrinking the payload.** A 400 KB response compressed to 60 KB still costs serialisation, transfer and `JSON.parse`. Shape payloads first (`04-server-and-api.md`).

## 4. HTTP caching

| Resource | Policy | Why |
| --- | --- | --- |
| `/_next/static/*` (hashed JS, CSS, fonts) | `public, max-age=31536000, immutable` | Set by Next.js; never override |
| Files in `public/` | Long cache with a content hash in the name, or a short cache if the name is stable | A stable name with a one-year cache cannot be updated |
| HTML and RSC payloads | `private, no-cache` or Next.js defaults | Per-user and dynamic |
| Authenticated JSON (API) | `private` with an `ETag`, so repeat reads become `304` with no body | Bandwidth and parse time; currently `no-store` everywhere |
| Responses that must never be stored (auth, session, secrets) | `no-store` | Correctness |

Notes:

- `Cache-Control: no-store` on *pages* disables the browser back/forward cache, which makes the back button slower. Prefer `private, no-cache` for pages that are safe to restore.
- Never mark an authenticated response `public`: a shared cache could serve one user's data to another.
- Conditional requests: compute a strong `ETag` from the response body (a hash), answer `If-None-Match` with `304`. Worth doing only for the heavy GETs (overview, analytics, big lists), because for small bodies the round trip, not the body, is the cost.

## 5. Cold starts and the function bundle

- Vercel Fluid compute is the default for new projects: warm instances are reused across requests, and on Node 20 or later bytecode caching pre-compiles function code so cold starts do less work. Most requests never see a cold start.
- The cold start still grows with what the function imports. All API routes live in one catch-all function, so any API request loads all eleven routers and their services. Keep imports at module top level cheap: no work at import time, no eager creation of clients.
- Keep heavy, rarely used dependencies out of the hot path (`import()` them inside the handler that needs them). The MCP SDK already lives in its own `/mcp` route.
- If measurements show cold starts dominating, split by prefix (a second route file for analytics, one for library) rather than micro-optimising.

## 6. Connections and protocol

- Vercel terminates TLS and serves HTTP/2 or HTTP/3 to the browser; nothing to configure. Keep the number of *distinct origins* at one so the browser reuses a single connection: no third-party scripts, no external font hosts.
- Fonts: use `next/font` (self-hosted, preloaded, no external request) if a web font is ever added. Today the app uses the system font stack, which costs nothing.
- Images: use `next/image` and WebP or AVIF; there are no raster images in the dashboard today, keep it that way.

## 7. Checklist

- [ ] `x-vercel-id` shows the same region as the database.
- [ ] A static asset comes back with `content-encoding: br` and `cache-control: ... immutable`.
- [ ] No gzip or brotli code in the application.
- [ ] Heavy GETs return `ETag` and honour `If-None-Match`.
- [ ] The first request after 5 minutes idle shows a skeleton, and the sign-in page wakes the database.
