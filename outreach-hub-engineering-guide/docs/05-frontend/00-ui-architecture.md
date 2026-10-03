    # Frontend Architecture

    Use Next.js App Router for routing/layout/auth boundaries and React client components only where interactivity requires them.

## Page pattern

A dashboard page should generally contain:

- server-rendered shell/initial metadata where useful;
- feature-level client component for interactive filters/table;
- query hooks colocated with the feature;
- reusable presentation components receiving typed props;
- no direct database import in UI.

## State ownership

- URL: shareable filters/search/sort where appropriate.
- TanStack Query: server state.
- component state: local transient UI state.
- React context: stable cross-tree UI concerns only.
- database: business state.

Do not mirror the same business state into three client stores.

