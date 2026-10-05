# Database Performance

Postgres 18 on Neon, reached through Drizzle. The rules are ordered by how much they help: fewer round trips first, then shape of queries, then indexes, then precomputation.

## 1. Transport: what a "query" costs

| Option | How it connects | Good for | Cost profile |
| --- | --- | --- | --- |
| `drizzle-orm/neon-http` (**current**) | One HTTPS request per statement; `database.batch([...])` sends several statements in one request and runs them as one transaction | Single, independent statements; stateless functions | No connection to manage. Every statement is a network round trip; no interactive transactions |
| `drizzle-orm/neon-serverless` (`Pool`) | WebSocket session | Interactive transactions, many statements in one request | Setup cost for each new connection; fast once a connection is warm (single-digit milliseconds) |
| `pg` over TCP, with Fluid pooling | Pooled TCP connections reused by warm function instances | Many statements per request on Vercel Fluid | Lowest per-statement latency; needs the pooled host and connection reuse across invocations |

Decision rule:

1. **Fix distance first** (`02-infrastructure-and-network.md`). In the same region an HTTP statement costs a few milliseconds and the transport debate stops mattering.
2. **Then reduce statement count** (section 2). This helps every transport.
3. Only if the measured round trips per request are still the dominant cost after 1 and 2, move hot paths to a pooled TCP connection. Keep the application services unchanged: they only see the `database` object, so the swap is confined to `shared/db/client.ts`.

Never open a new client per query inside a loop, and do not hold a module-level client that outlives the platform's connection reuse rules.

## 2. Round trips: the main lever

A statement is a round trip. Budget: reads 3 or fewer sequential, writes 4 or fewer sequential.

**Do**

- Run independent reads together: `Promise.all([...])`. Latency becomes the slowest one, not the sum.
- Make a mutation and its audit event one `database.batch([...])`. Already the rule here; keep it.
- Merge dependent lookups: one query with a `JOIN` or a CTE instead of "find prospect, then find person, then find organization".
- Fetch what the next step needs in the first query (select the joined names with the row) instead of an enrichment query per row.
- Replace "check then write" with a constraint plus `ON CONFLICT` where the rule is about uniqueness. One statement, race-free.
- Page with a keyset cursor and fetch `limit + 1` rows to know if there is a next page, instead of a separate count (the first page may count; later pages never recount; already the pattern).

**Do not**

- Query inside `for` or `map` (N+1). Fetch with `WHERE id IN (...)` or a `JOIN`, then group in memory.
- Issue a statement whose result is not used on every path (a membership check when no campaign was given).
- Add a "just in case" existence query before every write when a unique constraint already enforces it.

Current hot spots and the intended fix are in `01-audit-findings.md` (D2: log-outreach makes 5 to 7 sequential statements; D3: the overview issues about 21 statements).

**Test it.** Assert the number of statements in integration tests for any service on a hot path, so a new query shows up in review:

```ts
const statements: string[] = [];
const database = drizzle({ client, logger: { logQuery: (query) => statements.push(query) } });
await service.logOutreach(actor, input);
expect(statements.length).toBeLessThanOrEqual(5);
```

## 3. Query shape rules

1. **Select only the columns used.** No `select *`. List queries return a preview (the outreach list returns 160 characters of the body, not the body).
2. **Everything has a bound:** a page `limit` with a hard maximum (50 here), a time window on aggregates, a group limit on breakdowns. No endpoint returns an unbounded set.
3. **Aggregate in SQL, not in JavaScript.** Use `count(*) FILTER (WHERE ...)` for several conditions in one pass over the rows, instead of several queries; `GROUP BY` instead of loading rows and counting. The analytics module does this; keep new reports in the same shape.
4. **Keep predicates sargable.** Do not wrap the indexed column in a function (`lower(col) = ...`, `date(col) = ...`); compare the column to a computed bound (`col >= $1 AND col < $2`) or create an expression index that matches.
5. **Text search:**
   - Substring or prefix (`ILIKE '%abc%'`) needs a trigram GIN index (`gin_trgm_ops`) on the normalised column. Exists on `people.normalized_name`, `organizations.normalized_name`, `person_emails.normalized_email`.
   - Whole-word search over long text uses a generated `tsvector` column with a GIN index (exists on outreach, interactions, prospects, notes).
   - Escape user input before building the pattern (`escapeLikePattern`).
6. **Ordering must match an index.** A keyset list orders by the same columns, same directions, as its index, with the id as the tie-breaker. If the order cannot use an index, the database sorts the whole filtered set.
7. **Distinct counts are expensive** (`count(distinct x)` sorts or hashes). Use them where the metric needs them (prospects reached) and bound the window.
8. **Do not trust an unqualified column in a correlated subquery.** In a single-table Drizzle query the column is rendered unqualified and silently binds to the wrong table; use explicit aliased SQL (learned the hard way in the campaigns module).
9. **Counts are a cost.** Count on the first page only. If an exact count is not needed, show "more" instead of a number.

## 4. Indexing playbook

An index speeds reads and slows every write, and takes space and cache. Add one for a measured query, not for a column.

### Which index for which question

| Question | Index |
| --- | --- |
| Equality or range on one column | B-tree on that column |
| Equality on A, then ordered by B | B-tree `(A, B)`; equality columns first, then the sort column, then range columns |
| "Active rows only" lists (the common case here) | **Partial** index `... WHERE archived_at IS NULL`; smaller and faster; the query must contain the same predicate |
| Keyset list `ORDER BY updated_at DESC, id DESC` | B-tree `(updated_at DESC, id DESC)` (plus the partial predicate) |
| `ILIKE '%text%'` | GIN with `gin_trgm_ops` |
| Whole-word search | GIN on a `tsvector` |
| Read a few columns without touching the table | Covering index with `INCLUDE (cols)` (index-only scan); only for very hot reads |
| A filter on an expression (`lower(email)`) | Expression index on the same expression |
| Foreign key used in joins or `RESTRICT` deletes | B-tree on the FK column: Postgres does **not** create one for you |

Rules:

- Column order is decided by the query: equality, then sort, then range. `(a, b)` serves filters on `a` and on `a, b`, not on `b` alone.
- Do not keep an index whose columns are a prefix of another (`(a)` next to `(a, b)`).
- Do not index low-selectivity columns alone (a status with three values) unless the query is a partial index on the rare value.
- A unique constraint is already an index; do not add a second one.
- Check usage before adding more: `pg_stat_user_indexes.idx_scan = 0` over a representative period marks an unused index.

### Current inventory (from `shared/db/schema/*`)

- People, organizations, prospects: partial keyset indexes `(updated_at DESC, id DESC) WHERE archived_at IS NULL` and name indexes, trigram GIN on names and emails, indexes on `persona`, `country_code`, `status`, `route_id`, `person_id`, `organization_id`, `last_contacted_at`, full-text GIN on prospects.
- `outreach_messages`: `(prospect_id, sent_at DESC)`, `(sent_at DESC)`, `organization_id`, `person_id`, `campaign_id`, `channel`, full-text GIN.
- `interactions`: `(prospect_id, occurred_at DESC)`, `outreach_message_id`, partial on `response_depth`, full-text GIN.
- `follow_ups`: `prospect_id`, partial `(due_at) WHERE status = 'active'`.
- `audit_events`: `(entity_type, entity_id)` and `(occurred_at)`.

### Known gaps and when to close them

With a few thousand rows every one of these is faster as a sequential scan, so **do not add them today**. Add one when its trigger is met and `EXPLAIN` shows a sequential scan on that table.

| Gap | Used by | Add when | Index |
| --- | --- | --- | --- |
| `outreach_messages` by route | Route and module stats, analytics breakdown by route | More than about 50,000 messages, or route stats over 100 ms | `(route_id, route_module_id)` |
| Replies by time | Replies per day, reply time, analytics trend | More than about 100,000 interactions | partial `(occurred_at) WHERE direction = 'inbound' AND type = 'reply'` |
| Message list order | Outreach list keyset `(sent_at DESC, id DESC)` | The list page shows an incremental sort in the plan at scale | `(sent_at DESC, id DESC)` |
| Awaiting reply | Newest unanswered message per prospect | More than about 50,000 messages | partial `(prospect_id, sent_at DESC) WHERE reply_status = 'none'` |
| Campaign membership lookups | Membership checks when logging outreach | Slow membership lookups in `EXPLAIN` | `(prospect_id)` on `campaign_prospects` if not already covered by its unique key order |

### Adding an index safely

1. Reproduce the slowness on a Neon branch seeded with production-like volume (`generate_series`), see `06-measurement-and-monitoring.md`.
2. Create the index on the branch, re-run `EXPLAIN (ANALYZE, BUFFERS)`, keep it only if the plan changes and the time drops.
3. Ship it as a forward-only Drizzle migration (`02-data/02-migrations.md`), tested on a branch before production.
4. On a table large enough that writes must not block, use `CREATE INDEX CONCURRENTLY`. It cannot run inside a transaction, so it is applied as its own manual migration step. At this product's size a plain `CREATE INDEX` takes milliseconds.
5. Re-check with `EXPLAIN` in production, and watch `idx_scan` to be sure it is used.

## 5. EXPLAIN workflow

Always on a branch with realistic volume, never guessed from an empty database.

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) <the exact statement, with real parameter values>;
```

Read it from the inside out:

| Sign | Meaning | Usual fix |
| --- | --- | --- |
| `Seq Scan` on a large table with a selective filter | No usable index | Index that matches the filter and order |
| `Rows Removed by Filter` much larger than rows returned | Index not selective for this filter | Composite or partial index |
| `Sort` with `Sort Method: external merge` | Sorting more than memory allows | Index that provides the order; reduce rows before sorting |
| `Nested Loop` with a large `loops` | Per-row inner lookups | Index on the join key; or restructure to a hash join |
| Estimated rows far from actual | Stale statistics | `ANALYZE <table>` |
| `Buffers: read` high, `hit` low | Cold cache (after a Neon wake) | Expect on the first query; not a plan problem |
| `Heap Fetches` high on an index-only scan | Visibility map not set | `VACUUM` (autovacuum normally handles it) |

Find what to look at with `pg_stat_statements` (available on Neon): order by `total_exec_time` to find what costs most overall, and by `mean_exec_time` to find what is slow per call.

## 6. Precomputation: only when a window query misses its budget

Order of preference when an aggregate (overview, analytics) gets too slow at real volume:

1. Narrow the window or add the index from section 4.
2. Merge several statements into one pass with `FILTER`.
3. Cache the result in the server for a short, per-owner window (`04-server-and-api.md`).
4. A rollup table maintained in the same transaction as the write (the schema already has `campaign_daily_stats`, unused so far), or a materialised view refreshed on a schedule that fits the free plan.

Do not build a rollup before step 1 to 3 have failed at realistic volume: it adds a write on every mutation and a second source of truth.

## 7. Writes and housekeeping

- Each mutation writes its row, an audit event, and (for idempotent commands) an idempotency record, in one `batch`. The pre-checks (rate limit, lookups) are what make a write slow, not the insert (`01-audit-findings.md`, D2).
- The rate-limit table is pruned when a key opens a window; keep that off the hot path (D2, Step 5).
- Bulk imports: batch inserts (hundreds of rows per statement), then `ANALYZE` the table so the planner sees the new volume.
- Autovacuum runs on Neon; do not disable it. Large deletes leave dead tuples; `VACUUM (ANALYZE)` afterwards.
- Keep `history_retention` (restore window) modest on the free plan; it is storage, not speed.

## 8. Checklist for a new query

- [ ] Selects only needed columns and has a hard bound.
- [ ] Runs in parallel with its siblings, or is merged with them.
- [ ] Sequential statements per request are within budget, and a test pins the number.
- [ ] Order and filter are served by an index or the table is small enough that it does not matter (state which).
- [ ] No N+1, no unqualified column in a correlated subquery, no function on an indexed column.
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` checked on a seeded branch if the table can grow past a few thousand rows.
