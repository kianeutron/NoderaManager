    # Dependency Direction and Reuse

    ## Reuse hierarchy

Prefer reuse in this order:

1. canonical schema/value object;
2. pure domain function;
3. application service;
4. repository/data helper;
5. reusable UI primitive;
6. reusable feature component;
7. hook only when it encapsulates React-specific behavior.

Do not create a hook just to wrap a function that does not use React state/effects/context.

## Business logic sharing

A business rule must not be copied into:

- client-side form validation;
- API route;
- MCP tool;
- import parser;
- database trigger.

Use a shared Zod schema for syntactic constraints and a domain/application service for semantic rules. Client validation is for UX; server validation remains authoritative.

## Composition over generic abstractions

Do not create abstractions such as `BaseRepository<T>` or `GenericCrudService<T>` unless repeated domain behavior is genuinely identical. Domain-specific functions are usually clearer and safer than inheritance/generic CRUD frameworks.

