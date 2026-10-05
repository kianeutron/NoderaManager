    # Vercel Deployment

    Deploy one Next.js project to Vercel Hobby initially.

## Production endpoints

```text
/                  dashboard
/api/...           typed app API
/mcp               remote MCP Streamable HTTP
/.well-known/...   auth metadata if required by chosen OAuth provider/MCP flow
```

Use Node.js runtime for routes that require Node-compatible DB/MCP/file parsing packages unless current tested packages support Edge safely. Do not mix runtimes casually.

Keep Vercel function execution bounded. Heavy file parsing should have strict file-size limits and may need deferred processing if it approaches function duration/memory limits.

Preview deployments must never default to production database/write credentials. Use a separate dev/preview environment or read-only/explicit configuration.

## Region

The function region must be the database region (Neon `aws-eu-central-1`, so Vercel `fra1`), set in Project Settings or `vercel.json` (`{ "regions": ["fra1"] }`). Verify after each deploy that touches infrastructure with the `x-vercel-id` response header (`edge::function::id`). See `docs/15-performance/02-infrastructure-and-network.md`.
