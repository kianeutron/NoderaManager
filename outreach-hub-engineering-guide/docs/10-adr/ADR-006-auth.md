    # ADR-006: Single-User Authentication First

    **Status:** Accepted concept; provider choice finalized during implementation after verifying current Vercel/MCP compatibility.

V1 is single-user/private. Use a mature auth library/provider and an explicit owner allowlist. Do not build account signup, organizations, roles, billing, or password reset workflows unless required.

Dashboard session auth and MCP OAuth/resource authorization are related but not necessarily identical protocols. Keep their verification modules separated while sharing user identity/authorization policy.

Do not invent an OAuth authorization server. Use a trusted provider/standard implementation compatible with the current MCP authorization requirements.

