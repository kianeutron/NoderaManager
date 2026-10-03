    # MCP Implementation Rules

    Use `@modelcontextprotocol/server` v2. Prefer `createMcpHandler` or the web-standard Streamable HTTP transport supported by the current SDK version and Next/Vercel runtime.

Factory pattern:

```text
buildMcpServer(context)
  registerPeopleTools(...)
  registerOrganizationTools(...)
  registerOutreachTools(...)
  registerLibraryTools(...)
  registerAnalyticsTools(...)
```

Tool registration files should not instantiate repositories directly. Inject an application service container/context.

### Serverless constraints

- no process-global authoritative session state;
- no in-memory locks as data integrity mechanisms;
- no assumption that two consecutive requests reach the same instance;
- database is the source of state;
- keep requests bounded in duration;
- stream only where useful.

### Outputs

Return compact structured outputs. Search tools should return stable IDs and enough context to choose a result, not entire database rows.

For write tools, return:

- canonical entity ID;
- whether the call created or reused an idempotent existing record;
- safe summary;
- relevant next-state fields.

### Where things live

- `shared/mcp/build-mcp-server.ts` only composes; each module owns its tool registration (`modules/<module>/mcp/*-tools.ts` for library, people, organizations, routes, prospects and notes).
- `shared/mcp/mcp-actor.ts` turns the verified bearer token into the audit actor (`type: "mcp"`, id from the token, a new request id per call). A tool running without verified auth throws.
- `shared/mcp/mcp-services.ts` builds every application service the tools call, per request, for the endpoint.
- `shared/mcp/run-mcp-tool.ts` runs a tool body: an `ApplicationError` becomes a tool error the caller can act on; anything else is logged by name and answered generically. `shared/mcp/tool-metadata.ts` holds the shared annotations, the write-scope challenge and `actorOf`.
- `shared/mcp/mcp-results.ts` maps results and expected failures to MCP output. Unexpected errors are logged by name only and answered with a generic message: they can carry SQL or document data.
- `shared/mcp/mcp-scopes.ts` holds the scope constants with no server-only imports.
- The request body limit is 256 KiB so a text document (up to 100,000 bytes) fits with JSON overhead.
- Tools are registered individually rather than through a generic wrapper: the SDK's callback type depends on the concrete schema, which a generic helper cannot preserve. Shared metadata (annotations, scope challenge) comes from small non-generic builders.

