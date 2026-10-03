    # Database Migration Discipline

    - Drizzle schema changes require generated SQL migration files committed to Git.
- Never run schema mutation automatically from application startup.
- Never use `push` against production as the normal deployment process.
- Review generated SQL before applying.
- Migrations are forward-only after production use.
- Additive changes first, data backfill second, destructive cleanup last.
- For renames, prefer add/copy/read-new/remove-old over a risky instant rewrite when data matters.
- Every migration that changes semantics needs a rollback/recovery note even if migrations are forward-only.
- CI checks that migrations are generated and schema is not drifting.

For zero-cost personal use, a manual migration command during deployment is acceptable initially, but it must be explicit and documented. Never let two Vercel deployments race migrations.

## Practice that has held up

- Generate with `pnpm db:generate`, then **read the SQL**. Drizzle-kit orders some statements unsafely (for example foreign keys before the unique index they need) and rewrites enum changes as a blind cast. Fix these by hand in the committed file; the snapshot stays correct.
- Drizzle-kit asks "created or renamed?" when a table drops and adds columns of the same type, and needs a real terminal. Answer "created" unless it truly is a rename.
- Changing enum values: cast the column to text, drop and recreate the type, cast back with an explicit `CASE` mapping for every retired value, and drop/set column defaults around the cast.
- Guard irreversible drops with a `DO $$ ... RAISE EXCEPTION` that refuses to run if the column holds data, and backfill before adding a check that existing rows could violate.
- Test on a throwaway Neon branch that already contains data in the old shape, using `pnpm db:migrate` itself, and verify the mapping. Then apply to production with the same command, which also records the migration in `drizzle.__drizzle_migrations`.
- Cut an untouched checkpoint branch of production first (`no_compute` is enough). It is the restore point the backup docs require; delete it once the release is verified.

