    # Validation and Contract Rules

    Use one schema per semantic input/output concept.

Validation layers:

1. syntactic/schema validation with Zod;
2. authorization/ownership;
3. semantic/domain validation in application service;
4. database constraints as final integrity layer.

Do not trust client-generated IDs, timestamps, actor information, audit fields, or status transitions.

Normalize inputs before duplicate checks. Preserve raw human-entered display fields separately when normalization would alter presentation.

Never silently coerce dangerous values. Date parsing, booleans, and numbers should be explicit.

