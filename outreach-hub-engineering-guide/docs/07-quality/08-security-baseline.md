    # Application Security Baseline

    - authentication required for all dashboard data;
- authorization checked server-side on every protected API/MCP operation;
- secure, HttpOnly, SameSite cookies for web sessions;
- CSRF-safe mutation model;
- strict CSP/security headers compatible with MUI/Next deployment;
- no secrets in `NEXT_PUBLIC_*`;
- strict input validation;
- parameterized SQL through Drizzle;
- private Blob storage;
- file type/size allowlist;
- output escaping/no unsanitized HTML;
- safe redirects;
- rate limits/bounds;
- dependency patching;
- audit events;
- least-privilege database/provider credentials;
- production source maps reviewed/disabled publicly unless intentionally protected;
- generic error responses externally.

Security is a design property, not a final checklist pass.

