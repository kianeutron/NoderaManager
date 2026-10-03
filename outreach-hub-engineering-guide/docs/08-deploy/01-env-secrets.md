    # Environment Variables and Secrets

    Validate environment variables on server startup/import using a Zod config module.

Categories:

- `DATABASE_URL`
- Vercel Blob token/config
- auth provider credentials
- application base URL
- MCP resource/auth issuer configuration
- observability keys only if a free/approved provider is intentionally added

Rules:

- `.env.example` has names/descriptions, never real values;
- no secrets under `NEXT_PUBLIC_*`;
- do not expose provider admin credentials to browser;
- separate development/preview/production values;
- rotate credentials after suspected leak;
- redact environment values from error/log output.

