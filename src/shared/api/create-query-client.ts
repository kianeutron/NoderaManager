import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isSessionExpired } from "@/shared/api/error-copy";

const signInPath = "/auth/sign-in";

/** An ended session is the same problem for every request, so it is handled once here: back to sign-in, not an error on each screen. */
function leaveIfSessionExpired(error: unknown): void {
  // A full navigation on purpose: it drops the signed-out session's cached data, which a client-side route change would keep.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (isSessionExpired(error) && window.location.pathname !== signInPath) window.location.href = signInPath;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: leaveIfSessionExpired }),
    mutationCache: new MutationCache({ onError: leaveIfSessionExpired }),
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } }
  });
}
