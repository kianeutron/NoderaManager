    # ADR-001: Next.js on Vercel

    **Status:** Accepted

## Decision

Use Next.js App Router as the web framework and Vercel as the deployment platform.

## Why

- one deployment for UI + server routes + MCP;
- excellent Vercel integration;
- server/client component boundaries reduce unnecessary client JS;
- mature React ecosystem and MUI support;
- route handlers fit API/MCP integration.

## Constraints

Use the latest security-patched Next 16.3.x release available at installation time. Security patching is operationally important because Next.js has active security releases.

## Rejected

React/Vite + separate function layout was viable but would require more custom application plumbing without providing a clear benefit for this private dashboard.

