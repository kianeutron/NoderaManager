    # Threat Model

    ## Assets

- contact identities and private notes;
- outreach content/history;
- strategy documents/CV;
- Gmail/LinkedIn external IDs;
- database and Blob credentials;
- MCP authorization tokens;
- user session.

## Main threats

- unauthorized dashboard access;
- exposed write-capable MCP endpoint;
- stolen session/token;
- IDOR against entity/document IDs;
- malicious uploaded file/content;
- prompt injection inside documents/notes returned through MCP;
- duplicate/replayed MCP mutation;
- import poisoning/CSV formula injection on export;
- XSS from notes/message bodies;
- SSRF through arbitrary user-supplied URLs if server fetch is ever added;
- dependency supply-chain issue;
- accidental public Blob URL;
- secret leakage in logs/source maps.

## Controls

Use auth, per-request authorization, strict schemas, idempotency, CSP, escaped rendering, safe file delivery, protocol-scoped MCP tools, audit logs, dependency review, and provider abstraction.

Treat content retrieved from documents as data, never instructions that can override tool authorization or user intent.

