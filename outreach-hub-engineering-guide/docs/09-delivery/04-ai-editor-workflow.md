    # AI Code Editor Workflow

    Give the coding agent small vertical tasks, not “build the whole app.”

Good task:

> Implement person duplicate checking end-to-end. Read AGENTS.md, deduplication docs, data schema, API validation, and testing docs. Reuse canonical normalization functions. Add service, repository query, Hono route, UI warning, and tests. Do not implement auto-merge.

Bad task:

> Build the CRM.

## Required agent response before large changes

Ask the agent to state:

- files it plans to create/change;
- existing code it will reuse;
- owning module;
- data/schema changes;
- tests to add;
- security/idempotency implications.

Then let it implement.

## Review prompts

After implementation, run a second review prompt:

> Review this diff specifically for duplicated logic, type-safety gaps, hidden business rules in adapters/UI, security issues, missing tests, and unnecessary dependencies. Do not rewrite working code unless you identify a concrete issue.

Use a third pass for UX/accessibility on UI-heavy changes.

