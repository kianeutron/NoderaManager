// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({ del: vi.fn(), get: vi.fn(), put: vi.fn() }));

const blob = await import("@vercel/blob");
const { createDocumentBlobStore } = await import("@/shared/blob/document-blob-store");

describe("remote document blob store", () => {
  beforeEach(() => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token-value");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ["open", (store: ReturnType<typeof createDocumentBlobStore>) => store.open("documents/a/b"), () => vi.mocked(blob.get)],
    ["save", (store: ReturnType<typeof createDocumentBlobStore>) => store.save("documents/a/b", "text", "text/plain"), () => vi.mocked(blob.put)],
    ["remove", (store: ReturnType<typeof createDocumentBlobStore>) => store.remove("documents/a/b"), () => vi.mocked(blob.del)]
  ])("turns a provider failure on %s into a retryable error without provider text", async (_name, run, provider) => {
    provider().mockRejectedValue(new Error("Vercel Blob: token-value rejected by store_abc"));

    const failure = await run(createDocumentBlobStore()).catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: "unavailable", reason: "storage_unavailable" });
    expect((failure as Error).message).not.toMatch(/token-value|store_abc/);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/token-value|store_abc/);
  });

  it("still reports a missing object as absent, not as an outage", async () => {
    vi.mocked(blob.get).mockResolvedValue(null);
    expect(await createDocumentBlobStore().open("documents/a/b")).toBeNull();
  });

  it("does not block service construction when production storage is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");

    const store = createDocumentBlobStore();
    const failure = await store.open("documents/a/b").catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: "unavailable", reason: "storage_unavailable" });
    expect((failure as Error).message).toBe("File storage is temporarily unavailable.");
  });
});
