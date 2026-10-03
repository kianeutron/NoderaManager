    # Example Feature Component Pattern

    A feature table component should receive/query typed view models and delegate reusable UI primitives.

Pattern:

```text
PeoplePage
  -> PeopleToolbar
  -> PeopleTable
      -> PersonRow
      -> StatusChip
  -> DuplicateCandidateDialog
```

Do not put API calls inside `PersonRow`. Mutations belong in feature-level hooks/controller logic. Presentational components should be easy to render/test with props.

Use view models when raw domain objects are awkward for display rather than adding formatting logic repeatedly in cells.

