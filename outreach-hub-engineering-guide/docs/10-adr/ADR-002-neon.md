    # ADR-002: Neon Postgres

    **Status:** Accepted for V1

Use Neon Postgres as the relational store through Drizzle.

Reasons:

- real Postgres relational constraints/querying;
- serverless-friendly connectivity;
- free tier suitable for small personal workload;
- easy connection from Vercel;
- portable standard SQL/Postgres model.

Do not use provider-specific features in domain logic. Provider connection code stays in `shared/db`.

If free-tier terms become unsuitable, migrate Postgres rather than redesigning the application.

