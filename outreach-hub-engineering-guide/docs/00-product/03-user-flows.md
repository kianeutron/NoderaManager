    # Critical User Flows

    ## Add a researched prospect

1. Search by name, email, LinkedIn URL, and company domain.
2. Show possible duplicates before creation.
3. Create/link organization.
4. Record persona, route/module, source, trigger, country, and why targeted.
5. Save prospect status as researched/ready.

## Log outreach manually

1. Open person or prospect.
2. Choose channel.
3. Paste exact subject/message.
4. Associate campaign, route/module, trigger, CTA, proof point.
5. Save external identifiers when known.
6. Write audit event.
7. Update last-contacted timestamp transactionally.

## Log through MCP

1. ChatGPT checks duplicate/search tools.
2. ChatGPT sends through the external channel only after user approval where appropriate.
3. ChatGPT calls `log_outreach` with exact sent content and external IDs.
4. Service performs idempotency check.
5. Mutation and audit event commit in one transaction.

## Receive a reply

1. Find outreach/conversation using external thread ID when available.
2. Append interaction, never overwrite original outreach.
3. Classify sentiment/response depth manually or through explicit MCP tool arguments.
4. Update prospect status if appropriate.
5. Create follow-up only when there is an actual next action.

## Upload a document

1. Validate filename, extension, declared MIME, size.
2. Obtain server-approved private upload token.
3. Upload directly to Vercel Blob where possible.
4. Persist metadata/checksum.
5. Queue or perform safe text extraction for supported formats.
6. Index searchable text.
7. Link to domain records.
8. Audit the upload.

