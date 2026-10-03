    # ADR-007: Vitest + Testing Library + Playwright

    **Status:** Accepted

- Vitest for TypeScript unit/integration test runner.
- Testing Library for React behavior tests.
- Playwright for browser E2E/accessibility smoke tests.

Avoid Jest + Vitest duplication. Avoid Cypress unless a future requirement justifies a second E2E framework.

