    # ADR-004: Hono for Typed HTTP API

    **Status:** Accepted

Use Hono for `/api` and Hono RPC typing for browser/client access.

Reasons:

- small API surface;
- excellent TypeScript inference;
- runtime validation composes with Zod;
- framework adapter remains thin;
- avoids hand-maintained request/response DTO duplication.

MCP does not call Hono. Both Hono and MCP call shared application services.

