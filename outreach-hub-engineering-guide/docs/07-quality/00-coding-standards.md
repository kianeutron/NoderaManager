    # Coding Standards

    ## Functions

- one purpose;
- explicit input/output types at public boundaries;
- prefer pure functions for normalization/rules;
- avoid boolean parameter piles; use named option objects;
- fail clearly on impossible states;
- no hidden I/O inside innocently named helpers.

## TypeScript

- no `any`;
- use `unknown` + narrowing for untrusted data;
- prefer discriminated unions;
- prefer `satisfies` when validating object shape while preserving inference;
- avoid enums unless needed for interoperability; literal const arrays + Zod are often better;
- no type assertions to bypass validation.

## Comments

Comment why, invariants, protocol constraints, and non-obvious tradeoffs. Do not narrate obvious code.

## Imports

Use stable aliases such as `@/modules/...` and `@/shared/...`. Do not reach across feature internals casually.

## Async

Always await meaningful promises. Handle parallel independent I/O with bounded `Promise.all` only when failure semantics are understood.

