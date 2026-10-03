    # Server State, Queries, and Caching

    TanStack Query owns interactive server state in client components.

Rules:

- stable query-key factories per module;
- invalidate the smallest relevant key after mutation;
- use optimistic updates only when rollback semantics are clear;
- do not duplicate query data into local state;
- configure stale time based on data volatility;
- never cache authorization decisions client-side as truth;
- query pagination/filter inputs are included in keys;
- prefetch detail data only when it materially improves UX.

Next.js server caching must not accidentally cache private per-user data across users. Use explicit cache behavior and review every authenticated server fetch.

