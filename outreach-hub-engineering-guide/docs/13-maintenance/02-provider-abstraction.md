    # Provider Abstraction and Exit Strategy

    Keep provider-specific code behind small adapters:

- `Database`/repositories use standard Postgres/Drizzle semantics;
- `BlobStore` exposes upload authorization, metadata, read/download, delete/archive as needed;
- `AuthVerifier` maps provider identity to internal actor;
- MCP transport registration is separate from tool services.

Do not wrap every library in meaningless interfaces. Abstract only boundaries likely to change/provider-lock us.

Exit path:

- Neon -> any managed Postgres;
- Vercel Blob -> S3-compatible object storage;
- Vercel -> another Next-compatible host;
- MCP remains protocol-standard.

