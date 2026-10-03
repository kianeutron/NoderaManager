    # Components, Hooks, and Reuse

    ## Component rule

A component should have one clear UI responsibility. Extract when:

- another screen needs the same UI/behavior;
- rendering logic obscures page intent;
- state/effects and visual markup become unrelated;
- testing a behavior requires mounting a huge parent.

Do not extract tiny one-off wrappers solely to reduce line count.

## Hooks

Create hooks only for React-specific reusable behavior such as:

- URL filter synchronization;
- query/mutation composition;
- dialog state used by a reusable component;
- resize/intersection/browser APIs.

Business rules belong in plain functions/services, not hooks.

## Reuse rule

Prefer a feature component with typed configuration over copying markup and changing labels. Avoid over-generic components with dozens of boolean props. Use composition and slots.

