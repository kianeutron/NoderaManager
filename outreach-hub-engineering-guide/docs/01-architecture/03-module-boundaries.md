    # Module Boundaries and Ownership

    ## Rule

Every business rule has one owner.

Examples:

- Person identity normalization belongs to People.
- Organization domain normalization belongs to Organizations.
- Duplicate candidate scoring belongs to Identity/Deduplication, not individual forms.
- Outreach status transitions belong to Outreach.
- Response-depth classification values belong to Interactions/Outreach domain.
- Route/module hierarchy belongs to Routes.
- File access rules belong to Library.

## Cross-module interactions

Application services may compose repositories/services from multiple modules, but avoid direct database joins hidden inside UI code.

When a shared concept is used by several modules, promote the smallest stable primitive to `shared/`. Do not move feature-specific logic into `shared/` merely to avoid an import path.

## Dependency cycles

Cycles are a design smell. Solve them by:

- moving a true shared primitive downward;
- introducing an application orchestration service;
- passing IDs/data rather than importing UI/domain modules bidirectionally.

Never solve cycles with dynamic imports or barrel-file tricks.

