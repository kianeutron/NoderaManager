    # Untrusted Content Handling

    Outreach bodies, replies, notes, imported CSV cells, and documents are untrusted content.

- render as text by default;
- Markdown rendering uses a safe parser with raw HTML disabled/sanitized;
- never execute embedded scripts;
- links use safe `rel` attributes and visible destination cues where appropriate;
- CSV export neutralizes spreadsheet formula injection for cells beginning with `=`, `+`, `-`, `@` according to export policy;
- do not server-fetch arbitrary URLs from notes without SSRF controls.

MCP tool results that include untrusted text must clearly separate data from trusted metadata/instructions.

