    # Example MCP Tool Adapter Pattern

    Illustrative responsibilities:

```ts
server.registerTool(
  'log_outreach',
  {
    description: 'Log an outreach message that has already been sent.',
    inputSchema: logOutreachInputSchema,
    // mutation annotations as supported by current SDK
  },
  async (input, extra) => {
    const actor = await requireMcpActor(extra);
    const result = await services.logOutreach(actor, input);
    return toMcpSuccess(result);
  },
);
```

The tool does not:

- perform database queries directly;
- resend the email;
- invent sent timestamps/external IDs;
- bypass duplicate/idempotency rules;
- implement status transitions itself.

Keep tool descriptions precise enough that ChatGPT knows whether a tool reads or mutates state.

