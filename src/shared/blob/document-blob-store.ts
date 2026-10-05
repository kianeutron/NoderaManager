import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

type NeonStorageConfig = Readonly<{
  bucket: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}>;

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

function neonStorageConfig(): NeonStorageConfig | null {
  const { AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey, AWS_ENDPOINT_URL_S3: endpoint, AWS_REGION: region, NEON_STORAGE_BUCKET: bucket } = process.env;
  if (!accessKeyId || !secretAccessKey || !endpoint || !region || !bucket) return null;
  return { accessKeyId, secretAccessKey, endpoint, region, bucket };
}

export function createDocumentBlobStore(): DocumentBlobStore {
  const config = neonStorageConfig();
  if (!config) {
    if (process.env.NODE_ENV === "development") return createLocalBlobStore();

    // Keep service construction side-effect free when optional storage is not configured. MCP
    // discovery builds all application services before it knows which tools will be used; a
    // missing storage provider must not make unrelated tools undiscoverable. Fail only when a
    // document operation is actually attempted, through the same sanitized boundary as provider
    // outages.
    const unavailable = async (): Promise<never> => {
      throw new Error("Document storage is not configured");
    };

    return {
      open: (blobKey) => storageOperation("open", unavailable),
      save: (blobKey, body, contentType) => storageOperation("save", unavailable),
      saveBytes: (blobKey, body, contentType) => storageOperation("save", unavailable),
      remove: (blobKey) => storageOperation("remove", unavailable)
    };
  }

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });

  return {
    open: (blobKey) => storageOperation("open", async () => {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: blobKey }));
        return result.Body?.transformToWebStream() as ReadableStream<Uint8Array> | undefined ?? null;
      } catch (error) {
        if (error instanceof Error && "name" in error && (error.name === "NoSuchKey" || error.name === "NotFound")) return null;
        throw error;
      }
    }),
    save: (blobKey, body, contentType) => storageOperation("save", async () => {
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: blobKey, Body: body, ContentType: contentType, IfNoneMatch: "*" }));
    }),
    saveBytes: (blobKey, body, contentType) => storageOperation("save", async () => {
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: blobKey, Body: new Uint8Array(body), ContentType: contentType, IfNoneMatch: "*" }));
    }),
    remove: (blobKey) => storageOperation("remove", async () => {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: blobKey }));
    })
  };
}
