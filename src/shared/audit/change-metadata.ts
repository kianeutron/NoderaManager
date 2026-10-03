/**
 * Audit metadata for an edit: which fields changed and their before/after values. Long or private text goes in
 * `redacted`: it is named as changed but its content never enters the audit trail.
 */
export function toChangeMetadata(current: Record<string, unknown>, changes: Record<string, unknown>, redacted: readonly string[] = []): Record<string, unknown> {
  const fields = Object.keys(changes);
  const visible = fields.filter((field) => !redacted.includes(field));
  return {
    fields,
    before: Object.fromEntries(visible.map((field) => [field, current[field]])),
    after: Object.fromEntries(visible.map((field) => [field, changes[field]]))
  };
}
