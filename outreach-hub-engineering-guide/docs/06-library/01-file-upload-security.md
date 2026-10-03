    # File Upload Security

    Allowlist file types required by the product. Initial list can include:

- PDF;
- DOCX;
- Markdown/TXT;
- CSV;
- PNG/JPEG/WebP.

Reject executable/script/archive formats by default.

Validate:

- authenticated user;
- extension;
- declared MIME;
- size (25 MB per file initially, one server config constant; see 04-document-metadata.md);
- generated storage key;
- filename length/characters;
- content signature where a safe parser/library supports it.

Do not trust user-provided path names. Generate blob keys server-side.

Do not render uploaded HTML/SVG as trusted application content. Never inject extracted text with `dangerouslySetInnerHTML`.

For DOCX/PDF, parsing is a server-side ingestion concern. Treat parser failures as non-fatal to storage: the file may remain downloadable even if search extraction failed.

Use direct-to-Blob client upload where supported to reduce Vercel function transfer, while the server controls upload authorization/metadata.

