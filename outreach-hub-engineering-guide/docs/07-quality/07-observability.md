    # Logging and Observability

    Use structured logs, not scattered `console.log` strings.

Include request ID/correlation ID at API and MCP boundaries.

Log events:

- request start/end at appropriate level;
- auth failures without credentials;
- mutation operation and entity IDs;
- external provider failures;
- document processing failures;
- MCP tool name/duration/result category;
- import summary.

Do not log full email/message bodies, document contents, auth tokens, cookies, database URLs, or sensitive uploaded content by default.

Create an internal Activity/Audit UI for business changes. Infrastructure logs and domain audit logs are different things.

