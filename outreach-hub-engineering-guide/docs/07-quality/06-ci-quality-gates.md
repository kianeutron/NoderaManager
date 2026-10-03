    # CI and Quality Gates

    Every pull request should run:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm playwright test   # critical subset in CI
```

Also check:

- no ungenerated Drizzle schema changes;
- no committed `.env` or secret patterns;
- dependency vulnerability review;
- formatting;
- duplicate/circular dependency lint where configured;
- bundle-size regression for large new client dependencies when practical.

Production deploy should require green quality gates. Do not configure auto-deploy around failing tests.

