    # ADR-005: Official MCP TypeScript SDK v2

    **Status:** Accepted

Use official MCP TypeScript SDK v2, current 2026 protocol line, over Streamable HTTP.

Do not use legacy v1 package examples copied from old tutorials unless explicitly required for compatibility.

Reasons:

- official protocol implementation;
- current remote HTTP transport;
- current auth/protected-resource support;
- Zod/Standard Schema support;
- avoids custom protocol code.

Serverless Vercel deployment should remain stateless unless a tested requirement demands resumability/session state.

