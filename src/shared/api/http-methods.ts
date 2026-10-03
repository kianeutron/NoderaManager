const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/** Safe methods only read; everything else changes state and is guarded accordingly (origin check, write rate limit). */
export const isStateChanging = (method: string): boolean => !safeMethods.has(method);
