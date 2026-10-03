    # Audit Log and Change History

    Every meaningful mutation records an immutable audit event.

Fields:

- id;
- occurred_at;
- actor_type (`user`, `mcp`, `import`, `system`);
- actor_id/label;
- request_id;
- action;
- entity_type/entity_id;
- source channel;
- safe summary;
- optional structured diff;
- metadata version.

Do not store secrets in diffs. Large bodies such as full document contents should not be duplicated into audit rows.

Audit creation should be in the same transaction as relational mutations when possible. With the Neon HTTP driver (no interactive transactions) that means one `database.batch([...mutation, auditStatement])`: repositories build the audit insert with `prepareAuditEvent` and append it to the same batch, and hand the event id back so callers can return an audit reference.

Audit history is append-only from the application. No delete/update endpoint is exposed.

