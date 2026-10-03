    # End-to-End Type Safety

    ## Compiler baseline

Enable strict settings including:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "useUnknownInCatchVariables": true,
  "verbatimModuleSyntax": true
}
```

Use `noEmit` for app type checking.

## Boundary rule

Everything from outside the trusted process is `unknown` until validated:

- HTTP body/query/params;
- MCP arguments;
- environment variables;
- webhook/import data;
- JSON columns;
- file metadata;
- external API responses.

Validate with Zod and then pass typed values inward.

## Canonical schemas

Avoid:

```ts
interface CreatePersonRequest { ... }
const createPersonSchema = z.object({ ...same fields... })
```

Prefer:

```ts
export const createPersonInputSchema = z.object({ ... })
export type CreatePersonInput = z.infer<typeof createPersonInputSchema>
```

## Domain unions

Use literal unions/enums derived from schema constants:

```ts
export const outreachChannels = ['email', 'linkedin', 'inmail', 'other'] as const
export const outreachChannelSchema = z.enum(outreachChannels)
export type OutreachChannel = z.infer<typeof outreachChannelSchema>
```

## Exhaustiveness

Use exhaustive `switch` helpers with a `never` check for domain statuses. Do not silently default unknown future states.

