    # File Size and Responsibility Guidelines

    Line counts are warning signals, not automatic quality metrics.

Soft targets:

- UI component: ~150 LOC;
- hook: ~100 LOC;
- application service: ~200 LOC;
- repository/query module: ~200 LOC;
- schema/domain rules file: ~200 LOC;
- test file: ~300-400 LOC if scenarios remain coherent.

Review/refactor when:

- file has more than one reason to change;
- exported API becomes hard to describe in one sentence;
- private helpers represent unrelated domains;
- tests require unrelated setup;
- import list reveals too many dependencies;
- scrolling is hiding boundaries.

Do not split cohesive code into tiny files that force constant jumping. Cohesion beats arbitrary LOC compliance.

