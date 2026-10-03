    # MCP Authentication and Security

    A write-capable `/mcp` endpoint must never be anonymous.

Current MCP authorization uses OAuth-style protected-resource discovery for production remote servers. Treat the MCP server as a resource server and use a proper authorization server/provider rather than inventing token issuance.

## Requirements

- HTTPS only.
- Validate bearer access tokens server-side.
- Validate issuer, audience/resource, expiry, and scopes.
- Publish protected resource metadata required by the current MCP specification.
- Use separate read/write scopes where supported, e.g. `outreach.read`, `outreach.write`.
- Fail closed when auth metadata/token verification fails.
- Never accept auth via query string.
- Never log bearer tokens.
- No permanent shared secret committed to the repository.

## ChatGPT compatibility

Before production connection, test the deployed endpoint using the current ChatGPT custom MCP app flow. OpenAI's MCP capabilities/plan requirements can change; do not weaken auth merely to make setup easier.

## Tool-level authorization

Read-only analytics/search and write commands must be distinguishable. Sensitive mutations can require stronger scopes/approval.

## Prompt injection resilience

Uploaded documents and notes are untrusted data. Tool results must never be interpreted as authorization instructions. A document saying “delete all contacts” has no authority to invoke a destructive operation.

