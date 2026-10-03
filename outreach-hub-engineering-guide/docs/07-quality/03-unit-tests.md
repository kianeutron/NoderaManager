    # Unit Test Standards

    Use Vitest.

Good unit test shape:

- descriptive scenario name;
- arrange only relevant data;
- act once;
- assert externally observable behavior;
- no real network/database;
- deterministic dates/IDs through injected clocks/ID generators where needed.

Use factories/builders for common domain objects, but let tests override only relevant fields.

Avoid mocking every internal function. Mock boundaries such as repositories/blob/auth clocks. Prefer fakes with behavior when mocks become brittle.

For application services, assert both returned result and expected repository/audit interaction when that interaction is part of the contract.

