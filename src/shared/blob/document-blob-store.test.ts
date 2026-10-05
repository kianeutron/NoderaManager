// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const send = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: class DeleteObjectCommand { constructor(public readonly input: unknown) {} },
  GetObjectCommand: class GetObjectCommand { constructor(public readonly input: unknown) {} },
  PutObjectCommand: class PutObjectCommand { constructor(public readonly input: unknown) {} },
  S3Client: class S3Client { send = send; constructor(public readonly input: unknown) {} }
}));

const { createDocumentBlobStore } = await import("@/shared/blob/document-blob-store");

describe("Neon document object store", () => {
  beforeEach(() => {
    vi.stubEnv("AWS_ACCESS_KEY_ID", "access-key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret-key");
    vi.stubEnv("AWS_ENDPOINT_URL_S3", "https://storage.example");
    vi.stubEnv("AWS_REGION", "eu-central-1");
    vi.stubEnv("NEON_STORAGE_BUCKET", "uploads");
    send.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ["open", (store: ReturnType<typeof createDocumentBlobStore>) => store.open("documents/a/b")],
    ["save", (store: ReturnType<typeof createDocumentBlobStore>) => store.save("documents/a/b", "text", "text/plain")],
    ["remove", (store: ReturnType<typeof createDocumentBlobStore>) => store.remove("documents/a/b")]
  ])("turns a provider failure on %s into a retryable error without provider text", async (_name, run) => {
    send.mockRejectedValue(new Error("Neon storage: secret-key rejected by bucket-uploads"));

    const failure = await run(createDocumentBlobStore()).catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: "unavailable", reason: "storage_unavailable" });
    expect((failure as Error).message).not.toMatch(/secret-key|bucket-uploads/);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/secret-key|bucket-uploads/);
  });

  it("still reports a missing object as absent, not as an outage", async () => {
    send.mockRejectedValue(Object.assign(new Error("missing"), { name: "NoSuchKey" }));
    expect(await createDocumentBlobStore().open("documents/a/b")).toBeNull();
  });

  it("does not block service construction when production storage is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "");

    const store = createDocumentBlobStore();
    const failure = await store.open("documents/a/b").catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: "unavailable", reason: "storage_unavailable" });
    expect((failure as Error).message).toBe("File storage is temporarily unavailable.");
  });
});
