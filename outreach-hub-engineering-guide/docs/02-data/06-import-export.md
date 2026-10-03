    # Import, Export, and Backfill

    ## Import pipeline

Use explicit stages:

`upload -> parse -> normalize -> validate -> dedupe preview -> user confirm -> commit -> audit`

Never let a CSV/JSON import directly insert into tables.

Each import row gets a stable staging identifier and result state: new, matched, conflict, invalid, skipped.

## Gmail/LinkedIn history

Historical Gmail data should be imported using stable message/thread IDs whenever available. LinkedIn data should use official export/manual records, not prohibited scraping/automation.

## Export

Provide a complete user-owned export:

- JSON for lossless structured data;
- CSV for major tables/analytics;
- manifest of documents and links;
- optional ZIP of private files through an explicit export process.

The application must never lock the user into Neon/Vercel-specific representations.

