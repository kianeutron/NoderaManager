// @vitest-environment node
import { HydrationBoundary } from "@tanstack/react-query";
import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { PrefetchedQueries } from "@/shared/api/PrefetchedQueries";

describe("PrefetchedQueries", () => {
  it("fetches every query on the server, in parallel, and passes the results on under the same keys", async () => {
    const order: string[] = [];
    const slow = vi.fn(async () => { order.push("slow-start"); await new Promise((resolve) => setTimeout(resolve, 20)); order.push("slow-end"); return { n: 1 }; });
    const fast = vi.fn(async () => { order.push("fast"); return { n: 2 }; });

    const element = await PrefetchedQueries({ queries: [{ queryKey: ["slow"], queryFn: slow }, { queryKey: ["fast"], queryFn: fast }], children: null });

    expect(isValidElement(element) && element.type === HydrationBoundary).toBe(true);
    // Started together: the fast one finished while the slow one was still waiting.
    expect(order).toEqual(["slow-start", "fast", "slow-end"]);
    const state = (element as { props: { state: { queries: { queryKey: unknown[]; state: { data: unknown } }[] } } }).props.state;
    expect(state.queries.map((query) => [query.queryKey, query.state.data])).toEqual(expect.arrayContaining([[["slow"], { n: 1 }], [["fast"], { n: 2 }]]));
  });

  it("leaves a failed query for the browser to fetch instead of failing the page", async () => {
    const element = await PrefetchedQueries({ queries: [{ queryKey: ["ok"], queryFn: async () => 1 }, { queryKey: ["down"], queryFn: async () => { throw new Error("database unavailable"); } }], children: null });

    const state = (element as { props: { state: { queries: { queryKey: unknown[] }[] } } }).props.state;
    expect(state.queries.map((query) => query.queryKey)).toEqual([["ok"]]);
  });

  it("uses a new cache for every request", async () => {
    const queryFn = vi.fn(async () => "value");
    await PrefetchedQueries({ queries: [{ queryKey: ["same"], queryFn }], children: null });
    await PrefetchedQueries({ queries: [{ queryKey: ["same"], queryFn }], children: null });

    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});
