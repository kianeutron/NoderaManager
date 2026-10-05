import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/shared/api/create-query-client";
import { liveFiguresKey } from "@/shared/api/live-figures";

describe("createQueryClient", () => {
  it("marks the live figures stale after any successful write, and leaves other queries alone", async () => {
    const client = createQueryClient();
    client.setQueryData([...liveFiguresKey, "overview", "30d"], { sent: 1 });
    client.setQueryData(["people", "list"], { items: [] });

    await client.getMutationCache().build(client, { mutationFn: () => Promise.resolve("done") }).execute(undefined);

    expect(client.getQueryState([...liveFiguresKey, "overview", "30d"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["people", "list"])?.isInvalidated).toBe(false);
  });

  it("does not touch the figures when a write fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = createQueryClient();
    client.setQueryData([...liveFiguresKey, "overview", "30d"], { sent: 1 });

    await client.getMutationCache().build(client, { mutationFn: () => Promise.reject(new Error("refused")) }).execute(undefined).catch(() => undefined);

    expect(client.getQueryState([...liveFiguresKey, "overview", "30d"])?.isInvalidated).toBe(false);
  });

  it("caches reads for 30 seconds and does not refetch on window focus", () => {
    const { queries } = createQueryClient().getDefaultOptions();
    expect(queries).toMatchObject({ staleTime: 30_000, refetchOnWindowFocus: false });
  });
});
