    # Master Build Prompt for GPT Work

    Build a production-quality private personal application called **Outreach Hub**. It is a dashboard, outreach CRM, strategy intelligence system, document library, analytics workspace, and remote MCP server used to track software-engineering client acquisition.

Use the supplied Vision UI Dashboard React/MUI Figma file as the visual direction. Preserve the dark premium dashboard feel, glass-like panels, clean typography, restrained gradients, strong hierarchy, compact information density, and polished navigation. Do not blindly copy irrelevant crypto/dashboard content from the template.

### Required stack

Use Next.js 16.3 App Router with the latest patched 16.3.x release, React 19, TypeScript 6 in strict mode, Material UI 9, Hono, Zod 4, Neon Postgres, Drizzle ORM/Drizzle Kit, private Vercel Blob storage, the official MCP TypeScript SDK v2, TanStack Query, React Hook Form, Vitest, Testing Library, and Playwright. Use pnpm.

### Architecture

This is a modular monolith deployed on Vercel. Do not create separate backend repositories or microservices. The frontend, typed HTTP API, MCP endpoint, domain/application services, data access, and file-library adapters live in one repository.

The UI and MCP must call the same application services. Never duplicate business logic in route handlers or MCP tool handlers.

### Core domains

Implement Routes, Modules, People, Organizations, Prospects, Signals, Campaigns, Outreach, Replies/Interactions, Follow-ups, Notes, Tags, Documents, Document Links, and Audit Events.

A Route is an acquisition strategy such as Agency Overflow, Recruiters, Fractional CTOs, Referral Partners, Intent Signals, LinkedIn Outreach, Communities, Vendor Ecosystems, and similar strategies. A Route contains Modules. Prospects and outreach records can be attributed to routes/modules.

### Identity and duplicate prevention

A person can have LinkedIn URL, normalized LinkedIn identity, email addresses, role, persona type, organization, country, city, languages, source, why targeted, current trigger, status, temperature, next action, channel history, and notes.

Organizations have name, normalized name, domain(s), website, LinkedIn URL, country, industry/type, size band, notes, and outreach history.

Before creation, perform duplicate checks using normalized email, normalized LinkedIn URL, canonical organization domain, and normalized names. Duplicate logic belongs in one domain service and is reused by UI, imports, API, and MCP.

### Outreach records

Preserve the exact subject and exact message that was sent. Store channel, target person/organization, timestamp, campaign, route/module, trigger, proof-point classification, CTA classification, delivery status, bounce status, reply status, Gmail message ID/thread ID when known, LinkedIn conversation URL when known, external source ID, follow-up date, and metadata.

Keep immutable history. Corrections should be represented by updated fields plus audit events rather than silently losing the original values.

### Library

Build a private document library backed by private Vercel Blob. Support PDF, DOCX, Markdown, TXT, CSV, common images, and other explicitly approved safe formats. Store metadata in Postgres. Never serve private files as permanently public blobs.

Document records support folders, tags, versions, description, checksums, MIME type, size, original filename, blob key/URL reference, extracted text/index status, and links to routes, campaigns, organizations, people, and prospects.

### MCP

Expose `/mcp` using the official Model Context Protocol TypeScript SDK v2 and Streamable HTTP. Keep the transport stateless unless a real requirement for resumable MCP sessions appears.

Expose narrowly scoped tools for duplicate checking, people/organization search, creating/updating prospects, logging outreach, logging replies/bounces/follow-ups, adding notes/signals, querying route/country/persona statistics, and searching the document library.

MCP handlers only authorize/validate/map and call application services. They never call internal HTTP endpoints and never contain parallel business logic.

Use MCP tool annotations correctly, including read-only hints for read tools. Do not expose delete/purge tools initially.

### Security

The application is private and single-user initially. Use server-side authentication with an allowlist. Keep credentials and provider tokens server-only. Protect all write endpoints. Use CSRF-safe patterns, secure cookies, strict security headers, validation, authorization, rate limiting for sensitive endpoints, audit logging, safe file handling, and explicit MIME/size allowlists.

MCP authentication must follow current MCP/OpenAI-compatible remote-server authorization. Never leave a write-capable MCP endpoint anonymously reachable.

### Quality

No `any`. No duplicated DTOs. No duplicated business rules. No `utils.ts` dumping grounds. No giant components. Use focused modules. Soft limits: roughly 150 lines for UI components, 200 for application services, 100 for hooks, 200 for repository modules; refactor based on responsibility, not arbitrary line count alone.

Write unit tests for domain logic and application services, integration tests for database/adapters and MCP contracts, and Playwright tests for critical user flows.

Create loading, empty, error, permission-denied, and success states. Accessibility is required.

### Cost

The application must not require any monthly paid infrastructure at initial personal usage. Use Vercel Hobby, Neon Free, and Vercel Blob Hobby within their published limits. Implement visible usage warnings and fail closed rather than silently enabling billable behavior. Keep storage/provider adapters isolated so providers can be changed later.

### Delivery style

Implement in vertical slices. Do not scaffold every future feature before one complete route works. First deliver auth + database + shell + People/Organizations + duplicate check + Outreach log + audit trail. Then add Routes/Modules, analytics, library, MCP, imports, maps/graphs, and refinements.

Treat `AGENTS.md` and all files under `docs/` as implementation requirements.

