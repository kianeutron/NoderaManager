    # Pull Request Checklist

    - [ ] Is there one clear reason for this change?
- [ ] Did I reuse existing schemas/services/components instead of duplicating them?
- [ ] Did I avoid adding a dependency unnecessarily?
- [ ] Does the API/MCP adapter remain thin?
- [ ] Are all untrusted inputs validated?
- [ ] Is auth/authorization enforced server-side?
- [ ] Are database changes migrated and constrained?
- [ ] Could retries create duplicates?
- [ ] Is every mutation audited?
- [ ] Are tests behavior-focused?
- [ ] Are UI error/loading/empty states handled?
- [ ] Is keyboard/accessibility preserved?
- [ ] Could this expose a private blob, token, email body, or document in logs?
- [ ] Does it stay within the zero-cost architecture?
- [ ] Do docs/ADRs need updating?

