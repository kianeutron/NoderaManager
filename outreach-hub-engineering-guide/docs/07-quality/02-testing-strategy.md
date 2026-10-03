    # Testing Strategy

    Testing pyramid for this product:

1. Many fast pure/domain/application unit tests.
2. Focused repository/API/MCP integration tests.
3. Small number of high-value Playwright end-to-end tests.

Test behavior and contracts, not implementation details.

Must-test business rules:

- identity normalization/dedupe;
- status transitions;
- idempotent outreach logging;
- route/module assignment rules;
- audit event creation;
- import conflict behavior;
- file access authorization;
- MCP input/auth/tool behavior.

A bug fix should add a regression test at the lowest layer capable of reproducing it.

Code coverage is a signal, not a goal. Do not write meaningless tests solely to increase percentage.

