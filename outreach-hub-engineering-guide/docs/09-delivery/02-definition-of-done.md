    # Definition of Done

    A feature is done when:

- behavior matches the product/domain requirement;
- module ownership is clear;
- no duplicated business rule was introduced;
- strict TypeScript passes without unsafe suppression;
- external inputs are runtime validated;
- authorization is server-side;
- mutation is audited and idempotent where retry is plausible;
- database constraints/migration are included when needed;
- unit tests cover rules;
- integration test covers important boundary behavior;
- critical UI flow has loading/empty/error/success states;
- accessibility checked;
- logs do not leak sensitive data;
- lint/typecheck/tests/build pass;
- documentation updated when contract/architecture changed.

