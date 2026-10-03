    # Forms and Mutation UX

    Use React Hook Form + Zod for complex forms.

- Reuse server canonical schemas where field semantics match.
- Create a dedicated form schema only when UI allows partial/draft values that differ from command input.
- Map form values to command input explicitly.
- Keep server validation authoritative.
- Field errors are specific and actionable.
- Mutation failures preserve entered data.
- Disable/guard duplicate submits.
- Destructive actions require deliberate confirmation.
- Auto-save only where data-loss risk is lower than accidental-write risk.

Duplicate-check UI should show candidate reasons (“same LinkedIn URL”, “same company + name”) rather than a vague warning.
- Error text comes from `describeError` and `describeIssue` (`docs/01-architecture/06-error-model.md`); never show `error.message`.
- A background step of a submit (the duplicate check) must surface its own failure, not swallow it.

