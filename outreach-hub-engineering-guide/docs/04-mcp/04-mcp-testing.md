    # MCP Testing Strategy

    Test MCP at three layers:

1. **Tool service tests**: application service behavior with in-memory/fake repositories.
2. **Protocol contract tests**: initialize/list-tools/call-tool against the MCP handler with valid/invalid payloads and auth.
3. **Deployed smoke test**: remote Vercel endpoint over HTTPS.

Required cases:

- unauthenticated request rejected;
- expired/invalid token rejected;
- read tool marked/read behavior correct;
- invalid schema returns protocol-safe error;
- duplicate `log_outreach` external ID is idempotent;
- audit event produced for mutation;
- no stack trace/private data leaks;
- tools list contains only expected tools;
- destructive tools absent;
- large search request bounded;
- two independent requests work without shared process state.

## Where the library tests live

- `src/shared/mcp/mcp-tools.contract.test.ts`: drives the real SDK handler (`tools/list`, `tools/call`) with fake services (`src/test/fake-services.ts`) for all modules. Covers the exact tool list, absence of destructive names, annotations, write-scope challenge, actor derivation, validation rejection, expected-versus-unexpected error mapping and no shared state between requests.
- `src/modules/library/application/*.service.test.ts`: business rules with fake repositories.
- `src/modules/library/**/*.integration.test.ts`: real Postgres (see integration tests), including audit rows and batch atomicity.

