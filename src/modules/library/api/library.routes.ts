import { Hono } from "hono";
import { getLibraryServices } from "@/modules/library/application/library-services";
import { documentFileQuerySchema, documentIdParamSchema, documentListQuerySchema } from "@/modules/library/domain/document.schema";
import { documentUploadMetadataSchema, maxUploadBytes } from "@/modules/library/domain/file-upload";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";
import { buildContentDisposition } from "@/modules/library/domain/file-delivery";
import { zodValidator } from "@/shared/api/zod-validator";
import { ownerOnly } from "@/shared/api/owner-only";
import { rateLimited } from "@/shared/api/rate-limited";
import { webUploadPolicy, webWritePolicy } from "@/shared/rate-limit/rate-limit-policies";

const noStore = { "Cache-Control": "no-store" } as const;

/** A body that is not a readable multipart form is the caller's mistake, not a server failure. */
async function readForm(request: Request) {
  try {
    return await request.formData();
  } catch {
    throw new LibraryCommandError("unsupported", "The upload could not be read", "upload_invalid");
  }
}

async function parseUploadForm(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxUploadBytes + 1_000_000) throw new LibraryCommandError("limit_exceeded", "Files must be 25 MB or smaller", "file_too_large");
  const form = await readForm(request);
  const file = form.get("file");
  if (!(file instanceof File)) throw new LibraryCommandError("unsupported", "A file is required", "file_missing");

  const rawTags = form.get("tags");
  let tags: unknown = [];
  if (typeof rawTags === "string" && rawTags.trim()) {
    try { tags = JSON.parse(rawTags); } catch { throw new LibraryCommandError("unsupported", "Tags must be valid JSON", "upload_invalid"); }
  }

  const metadata = documentUploadMetadataSchema.parse({
    title: form.get("title"),
    description: typeof form.get("description") === "string" ? form.get("description") : undefined,
    category: form.get("category"),
    folderId: typeof form.get("folderId") === "string" && form.get("folderId") ? form.get("folderId") : undefined,
    tags
  });
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { metadata, file: { filename: file.name, mimeType: file.type, bytes } };
}

export const libraryRoutes = new Hono()
  .use(ownerOnly)
  .use(rateLimited(webWritePolicy))
  .post("/documents/upload", rateLimited(webUploadPolicy), async (context) => {
    const upload = await parseUploadForm(context.req.raw);
    const result = await getLibraryServices().createFileDocument(context.var.actor, upload.metadata, upload.file);
    return context.json(result, 201, noStore);
  })
  .get("/documents", zodValidator("query", documentListQuerySchema), async (context) => {
    const page = await getLibraryServices().listDocuments(context.req.valid("query"));
    return context.json(page, 200, noStore);
  })
  .get("/facets", async (context) => context.json(await getLibraryServices().getFacets(), 200, noStore))
  .get("/documents/:id", zodValidator("param", documentIdParamSchema), async (context) => {
    const document = await getLibraryServices().getDocument(context.req.valid("param").id);
    return document ? context.json(document, 200, noStore) : context.json({ code: "NOT_FOUND" }, 404, noStore);
  })
  .get("/documents/:id/file", zodValidator("param", documentIdParamSchema), zodValidator("query", documentFileQuerySchema), async (context) => {
    const file = await getLibraryServices().openDocumentFile(context.req.valid("param").id, context.req.valid("query").disposition);
    if (!file) return context.json({ code: "NOT_FOUND" }, 404, noStore);

    return new Response(file.stream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": buildContentDisposition(file.disposition, file.filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  });

export type LibraryRoutes = typeof libraryRoutes;
