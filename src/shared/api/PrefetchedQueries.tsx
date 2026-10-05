import { dehydrate, HydrationBoundary, QueryClient, type QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";

type PrefetchedQuery = Readonly<{ queryKey: QueryKey; queryFn: () => Promise<unknown> }>;

/**
 * Fetches the first screen's queries on the server, next to the database and in parallel, and hands the results to the
 * client's cache under the same keys. The page then renders with its data instead of loading, hydrating and only then
 * asking for it. A query that fails here is simply left for the browser to fetch, so a slow or failing read never blocks
 * or breaks the page. Use the services directly in `queryFn`, never the HTTP API.
 */
export async function PrefetchedQueries({ queries, children }: Readonly<{ queries: readonly PrefetchedQuery[]; children: ReactNode }>) {
  // One per request: a cache shared between requests could show one visitor another's data.
  const queryClient = new QueryClient();
  await Promise.all(queries.map((query) => queryClient.prefetchQuery(query)));
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
