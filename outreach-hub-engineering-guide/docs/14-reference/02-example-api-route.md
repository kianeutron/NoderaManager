    # Example Hono Route Pattern

    Illustrative route:

```ts
people.post(
  '/',
  zValidator('json', createPersonInputSchema),
  async (c) => {
    const actor = requireWebActor(c);
    const input = c.req.valid('json');
    const result = await services.people.create(actor, input);
    return c.json(toPersonView(result), 201);
  },
);
```

Route code is boring by design. If it contains duplicate matching, SQL, status transitions, audit object construction, or Blob operations, move those responsibilities to application/infrastructure layers.

