import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { ApplicationError } from "@/shared/errors/application-error";
import { logUnexpectedError } from "@/shared/observability/log-unexpected-error";

/** The only place that knows Vercel Blob exists (ADR-003, provider-abstraction.md). */
export type DocumentBlobStore = Readonly<{
  open: (blobKey: string) => Promise<ReadableStream<Uint8Array> | null>;
  /** Writes a new private object. Never overwrites: a key collision is a bug, not something to hide. */
  save: (blobKey: string, body: string, contentType: string) => Promise<void>;
  saveBytes?: (blobKey: string, body: ArrayBuffer, contentType: string) => Promise<void>;
  remove: (blobKey: string) => Promise<void>;
}>;

const localBlobRoot = path.join(process.cwd(), ".local-blob-store");

function localBlobPath(blobKey: string): string {
  if (!/^documents\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/.test(blobKey)) throw new Error("Invalid blob key");
  return path.join(localBlobRoot, blobKey);
}

function createLocalBlobStore(): DocumentBlobStore {
  return {
    open: async (blobKey) => {
      try {
        await readFile(localBlobPath(blobKey));
        return Readable.toWeb(createReadStream(localBlobPath(blobKey))) as ReadableStream<Uint8Array>;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    save: async (blobKey, body) => {
      const target = localBlobPath(blobKey);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body, { flag: "wx" });
    },
    saveBytes: async (blobKey, body) => {
      const target = localBlobPath(blobKey);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, new Uint8Array(body), { flag: "wx" });
    },
    remove: async (blobKey) => {
      await rm(localBlobPath(blobKey), { force: true });
    }
  };
}

/**
 * A provider failure (network, quota, outage) is not the caller's mistake and not a bug in our code: it becomes a
 * retryable `unavailable` error with a fixed message, and only the error type is logged (provider messages can carry keys).
 */
async function storageOperation<Result>(operation: string, action: () => Promise<Result>): Promise<Result> {
  try {
    return await action();
  } catch (error) {
    logUnexpectedError("blob", error, { operation });
    throw new ApplicationError("unavailable", "File storage is temporarily unavailable.", "storage_unavailable");
  }
}

export function createDocumentBlobStore(): DocumentBlobStore {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (process.env.NODE_ENV === "development") return createLocalBlobStore();
    throw new Error("BLOB_READ_WRITE_TOKEN is required outside local development");
  }

  const write = (blobKey: string, body: string | ArrayBuffer, contentType: string) => put(blobKey, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });

  return {
    open: (blobKey) => storageOperation("open", async () => {
      const result = await get(blobKey, { access: "private" });
      return result?.statusCode === 200 ? result.stream : null;
    }),
    save: (blobKey, body, contentType) => storageOperation("save", async () => void await write(blobKey, body, contentType)),
    saveBytes: (blobKey, body, contentType) => storageOperation("save", async () => void await write(blobKey, body, contentType)),
    remove: (blobKey) => storageOperation("remove", () => del(blobKey))
  };
}
