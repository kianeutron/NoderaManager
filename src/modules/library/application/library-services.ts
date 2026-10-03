import { createLibraryServices } from "@/modules/library/application/create-library-services";
import { ensureOwnerUserId } from "@/shared/auth/owner-user.repository";
import { createDocumentBlobStore } from "@/shared/blob/document-blob-store";
import { getServerEnvironment } from "@/shared/config/server-env";
import { getDatabase } from "@/shared/db/client";

/** Composition root shared by the HTTP API and MCP tools, wired to the real database, Blob store and owner. */
export function getLibraryServices() {
  const database = getDatabase();

  // Resolved lazily and at most once per request.
  let ownerUserId: Promise<string> | undefined;
  const resolveOwnerUserId = () => (ownerUserId ??= ensureOwnerUserId(database, getServerEnvironment().OWNER_EMAIL));

  return createLibraryServices({ database, blobStore: createDocumentBlobStore(), resolveOwnerUserId });
}
