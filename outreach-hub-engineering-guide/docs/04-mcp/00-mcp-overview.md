    # MCP Architecture

    The MCP endpoint makes Outreach Hub operable by ChatGPT without giving ChatGPT direct database credentials.

## Transport

Use official MCP TypeScript SDK v2 and **Streamable HTTP** at `/mcp`. Remote servers use HTTP; stdio is for local-spawned integrations and is not the deployment model here.

Prefer stateless HTTP handling initially. Serverless function instances are ephemeral, so never keep authoritative MCP session/application state in process memory.

## Adapter rule

An MCP tool handler does four things:

1. authenticate/authorize caller;
2. validate typed tool arguments;
3. call an application service;
4. map result/error to MCP content/structured output.

It does not query Drizzle directly and does not call `/api` over HTTP.

## Tool design

Tools should be narrow, deterministic, and composable. A tool named `do_everything_with_prospect` is a design failure.

Favor explicit searches and commands that make audit behavior obvious.

