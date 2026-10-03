    # Document Extraction and Search

    Start with deterministic full-text search before adding embeddings.

## Extraction

- MD/TXT: decode safely with size bounds.
- CSV: parse with row/column limits and index text representation only if useful.
- DOCX: use a maintained parser such as Mammoth for text extraction, not HTML rendering.
- PDF: use a maintained Node-compatible text extraction package validated against Vercel function limits.
- Images: metadata only initially; OCR is optional and should not add a paid dependency.

## Index

Store normalized extracted text/chunks in Postgres with document/version references. Use Postgres full-text search/trigram support when available.

Do not store an embedding vector merely because AI may use the library later. Add vector search only when semantic search demonstrably needs it and a zero-cost/reliable strategy is chosen.

Search results return snippets and stable document IDs; file bytes are fetched separately with authorization.

