    # Rate Limiting and Abuse Controls

    This is single-user software, but the public internet can still hit its endpoints.

Rate limit:

- authentication attempts;
- MCP endpoint/tool calls;
- upload-token creation;
- expensive search/import endpoints;
- mutation bursts.

Prefer provider/framework primitives or a simple server-side limiter that does not require another paid service. If robust distributed rate limiting cannot be implemented reliably for free, combine authentication, Vercel firewall/platform protections, bounded operations, and conservative per-request limits rather than inventing unsafe in-memory global state.

Never rely on client-side debouncing as security.


## In code

A fixed-window counter in Neon (`rate_limit_windows`, one row per key and window), not process memory, because serverless instances share none. One atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` counts a request, using the database clock, so concurrent requests cannot both read the same count.

- `shared/rate-limit/`: `rate-limit-policies.ts` (named limits), `rate-limit.repository.ts` (the SQL), `create-rate-limiter.ts` (`enforce(subject, policy)` throws `RateLimitedError`), `rate-limiter.ts` (server wiring).
- Web: `rateLimited(policy)` middleware in `shared/api/rate-limited.ts`, after `ownerOnly`, keyed by the verified actor. Every router counts state-changing requests under `web-write` (60/min); the upload endpoint also counts under `web-upload` (10/min). Reads are not counted.
- MCP: the route counts every request per OAuth client under `mcp` (120/min) and answers `429` with `Retry-After`.
- The API answers `429 {code:"RATE_LIMITED"}` with a `Retry-After` header; the client words it ("You are doing that too quickly…").
- **Fails open.** If the counter cannot be reached the request proceeds and one `unexpected_error` line (scope `rate-limit`) is logged, so a database hiccup never locks the owner out. Authentication stays the real guard.
- A key's expired windows are deleted when it opens a new window, so keys never accumulate rows.
- Not covered here: authentication attempts. Sign-in runs on the hosted auth provider, which applies its own limits; add Vercel firewall rules for the `/api/auth` path if stricter control is wanted.
