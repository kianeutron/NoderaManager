    # Example Application Service Pattern

    Illustrative shape, not copy-paste final code:

```ts
export const createLogOutreachService = (deps: {
  outreachRepo: OutreachRepository;
  prospectRepo: ProspectRepository;
  audit: AuditWriter;
  clock: Clock;
}) => async (actor: Actor, input: LogOutreachInput) => {
  // authorize at application boundary/policy
  // validate semantic invariants
  // execute transaction through repository/unit boundary
  // enforce idempotency
  // insert exact outreach
  // update canonical contact metadata
  // append audit event
  // return domain result
};
```

The service has no knowledge of Hono, Next Request/Response, MCP content blocks, React, or MUI.

Inject clocks/ID generators only when deterministic testing requires it; do not create dependency-injection ceremony for pure functions.

