    # Repository and Query Rules

    Repositories isolate Drizzle/SQL from application logic.

Good repository API:

```ts
findPersonById(id)
findPersonIdentityCandidates(identity)
insertPerson(input, tx?)
listProspects(filters, page)
```

Avoid generic CRUD APIs such as `repository.update(table, id, object)` leaking persistence concerns upward.

Rules:

- select only columns needed by the use case;
- no N+1 query patterns in list pages;
- centralize common projection/query fragments where they are genuinely identical;
- use transactions passed explicitly to repository functions participating in an application transaction;
- repository functions do not decide authorization;
- application services do not assemble raw SQL.

Use database-level pagination and filtering. Never fetch every outreach record to the browser and filter there.

