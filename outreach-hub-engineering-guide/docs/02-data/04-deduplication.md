    # Identity Normalization and Deduplication

    Duplicate prevention is a core feature, not a UI convenience.

## Deterministic identity keys

Normalize:

- email: trim, lowercase domain, conservative lowercase full address for comparison;
- LinkedIn profile: remove query/fragment, normalize host/path/trailing slash;
- organization domain: parse URL, lower host, remove `www.` only where canonicalization policy says so;
- names: Unicode normalize, trim/collapse whitespace, lowercase for candidate matching only.

Never merge people purely because normalized names match.

## Match levels

- **Exact**: same normalized email, LinkedIn identity, or trusted external contact ID.
- **Strong candidate**: same normalized name + same organization/domain.
- **Weak candidate**: same name + same country/role similarity.

Exact matches block duplicate creation. Strong candidates require user/MCP caller to confirm reuse vs new identity. Weak candidates are advisory only.

## Organization matching

Canonical domain is strongest. Name-only company matching is never automatically merged.

## Shared service

Expose a single `findDuplicateCandidates` application service used by UI, imports, API, and MCP. Do not implement separate duplicate logic in each path.

