    # Repository and File Structure

    Recommended structure:

```text
/
  AGENTS.md
  README.md
  package.json
  pnpm-lock.yaml
  next.config.ts
  drizzle.config.ts
  playwright.config.ts
  vitest.config.ts
  .env.example

  src/
    app/
      (auth)/
      (dashboard)/
      api/[[...route]]/route.ts
      mcp/route.ts
      layout.tsx
      error.tsx
      not-found.tsx

    modules/
      people/
        domain/
        application/
        data/
        api/
        ui/
        tests/
      organizations/
      prospects/
      routes/
      campaigns/
      outreach/
      followups/
      library/
      analytics/
      imports/

    shared/
      auth/
      db/
        schema/
        migrations/
        client.ts
      api/
      mcp/
      blob/
      audit/
      errors/
      observability/
      security/
      ui/
      lib/
      config/

    test/
      fixtures/
      factories/
      setup/

  e2e/
  docs/
```

## Feature module pattern

Example:

```text
modules/outreach/
  domain/
    outreach.schema.ts
    outreach.types.ts
    outreach.rules.ts
  application/
    log-outreach.service.ts
    list-outreach.service.ts
  data/
    outreach.repository.ts
    outreach.queries.ts
  api/
    outreach.routes.ts
  ui/
    OutreachTable.tsx
    OutreachComposer.tsx
    useOutreachFilters.ts
  tests/
```

Do not mechanically create every folder for tiny modules. Start minimal and split when responsibilities emerge.

## Naming

- files: `kebab-case.ts` except React components `PascalCase.tsx` is acceptable if consistently enforced;
- schemas: `*.schema.ts`;
- service: `verb-noun.service.ts`;
- repository: `*.repository.ts`;
- tests colocated as `*.test.ts(x)` or in module `tests/` consistently;
- avoid `index.ts` barrel files across large module trees because they hide dependency direction and can create cycles.

