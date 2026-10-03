    # Authorization Policy

    V1 has one owner user, but authorization is still explicit.

Each service command receives an authenticated actor/context. Do not infer authorization merely because a route was under an authenticated layout.

Policies:

- only owner can read/write private records;
- document download requires owner auth;
- MCP token identity maps to owner and required scopes;
- audit actor is derived from verified auth context, never caller payload;
- system/import actors are explicit trusted internal contexts.

When multi-user arrives later, replace the owner policy with tenant/resource policies without rewriting domain services.

