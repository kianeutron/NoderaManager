    # Technology Stack and Dependency Policy

    ## Chosen stack

Use a Vercel-native modular monolith:

- **Next.js 16.3.x** App Router. Install the latest security-patched 16.3 patch, not an older pinned patch copied from this document.
- **React 19**.
- **TypeScript 6**, strict.
- **MUI 9** + Emotion.
- **Hono** for `/api` so the browser client can use Hono RPC typing.
- **Zod 4** for runtime schemas.
- **Drizzle ORM/Kit** with **Neon Postgres**.
- **Vercel Blob** private storage for library files.
- **MCP TypeScript SDK v2** (`@modelcontextprotocol/server`) for `/mcp`.
- **TanStack Query** for interactive client-side server state.
- **React Hook Form** for complex forms.
- **Recharts**, **@xyflow/react**, **react-simple-maps** for data visualization.
- **Vitest**, **Testing Library**, **Playwright**.
- **pnpm**.

## Dependency rule

Each dependency must answer one question: what important problem does it solve better and more safely than our existing stack?

Before adding a package:

1. Search current dependencies for the capability.
2. Prefer platform/browser/Node features where safe.
3. Check maintenance activity and security advisories.
4. Prefer packages with first-class TypeScript types.
5. Avoid packages that duplicate a large existing library for one small helper.
6. Avoid abandoned packages for auth, parsing, crypto, validation, or protocol handling.
7. Record architecture-shaping dependencies in an ADR.

## Avoid

- Axios when native `fetch` or typed Hono client suffices.
- Lodash as a general dependency.
- Moment.js.
- Redux unless future complexity clearly exceeds TanStack Query + local state.
- An ORM in addition to Drizzle.
- Multiple schema validators.
- Multiple chart libraries.
- Multiple component libraries.
- Home-grown OAuth/MCP protocol code.

## Versioning

Pin exact versions in the lockfile. Use compatible ranges only in `package.json` according to repository update policy. Renovate/Dependabot may propose updates, but security patches are prioritized and major upgrades require an ADR/checklist.

