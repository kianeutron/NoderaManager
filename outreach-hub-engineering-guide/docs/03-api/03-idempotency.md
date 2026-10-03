    # Mutation Idempotency

    MCP and imports can retry. Logging the same email twice is unacceptable.

For operations with external IDs, derive idempotency from:

- source + Gmail message ID;
- source + LinkedIn conversation/message ID if available;
- explicit caller-provided idempotency key.

For manual operations without external IDs, allow an optional idempotency key and detect suspicious duplicate payloads within a short window, but do not overmerge legitimate repeated messages.

The service, not the adapter, enforces idempotency.

A repeated successful request should return the existing canonical record instead of inserting another one.

## In code

`shared/idempotency/`: `idempotency.repository.ts` looks a key up (`find`, unexpired only) and builds the statement that records it (`prepareIdempotencyRecord`), which goes into the **same `batch`** as the command so a crash cannot leave one without the other; `fingerprint.ts` hashes the parts that make two requests the same (leave out anything a retry changes, such as a default timestamp). A repeated key with the same fingerprint returns the first result (`created: false`); with a different one it is refused (`idempotency_key_reused`). Keys live a day. Without a key, `logOutreach` and `logInteraction` also treat identical content within ten minutes as a double submit. Used by both.

