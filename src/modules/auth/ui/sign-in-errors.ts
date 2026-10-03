/** Shown when the sign-in request itself fails: no network, or the auth service is down. */
export const signInUnavailableMessage = "We couldn't start sign-in. Check your connection and try again.";

const knownFailures: Readonly<Record<string, string>> = {
  access_denied: "Sign-in was cancelled. Try again when you're ready."
};

/**
 * The auth provider sends the user back to the sign-in page with `?error=<code>`. The code is untrusted input, so it is
 * only ever looked up, never displayed; anything unrecognised gets the same generic sentence.
 */
export function describeSignInError(code: string | undefined): string | null {
  if (!code) return null;
  return knownFailures[code] ?? "Sign-in didn't complete. Try again.";
}
