    # ChatGPT and Outreach Hub Operations

    Desired workflow:

```text
Research -> MCP duplicate check -> propose targets -> user approves outreach
-> Gmail/LinkedIn action -> MCP log exact sent record -> later read reply
-> MCP log interaction/status/follow-up
```

## Operational rules

- Check `find_duplicate_candidates` before proposing a new person when sufficient identifiers exist.
- Check organization history before treating a company as new.
- Log only messages confirmed as sent, not drafts.
- Preserve exact sent subject/body.
- Use external message/thread IDs whenever returned by the sending connector.
- Do not infer a reply category when the content is ambiguous; store raw interaction and ask/user-confirm classification.
- Never mark a person “do not contact” or delete data based only on model inference.
- Always distinguish “timing no” from structural disqualifier when evidence supports it.
- Every MCP write returns an audit/event reference.

The database is the source of truth; chat memory is not.

