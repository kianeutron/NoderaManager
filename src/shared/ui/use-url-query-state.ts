"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type NavigationMode = "push" | "replace";

/** How a page's state maps to and from its query string. Define it once at module level so it stays referentially stable. */
export type UrlStateCodec<State> = Readonly<{
  parse: (params: URLSearchParams) => State;
  serialize: (state: State) => string;
}>;

/**
 * The URL is the single source of truth for a page's filters and selection: shareable, and the back button works.
 * `push` adds a history entry (selecting, filtering); `replace` does not (typing in a search box).
 */
export function useUrlQueryState<State>(codec: UrlStateCodec<State>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = useMemo(() => codec.parse(searchParams), [codec, searchParams]);

  const navigate = useCallback((next: State, mode: NavigationMode = "push") => {
    const query = codec.serialize(next);
    router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [codec, pathname, router]);

  return [state, navigate] as const;
}
