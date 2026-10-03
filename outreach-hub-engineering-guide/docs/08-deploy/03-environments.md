    # Environment Strategy

    Use at least:

- local development;
- preview/test;
- production.

Never use production as the default developer database.

Migrations are tested against preview/test before production.

Preview MCP write access should be disabled or clearly isolated from production data.

Use different auth redirect URLs and provider credentials per environment where required.

Seed scripts must refuse to run against production unless an explicit, reviewed override is supplied.

