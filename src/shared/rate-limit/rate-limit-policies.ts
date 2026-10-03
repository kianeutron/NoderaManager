export type RateLimitPolicy = Readonly<{
  /** Prefix of the counter key, so policies never share a counter. */
  name: string;
  limit: number;
  windowSeconds: number;
}>;

// Generous for one person working, tight enough to stop a runaway script or a stolen session from hammering writes.
export const webWritePolicy = { name: "web-write", limit: 60, windowSeconds: 60 } as const satisfies RateLimitPolicy;
export const webUploadPolicy = { name: "web-upload", limit: 10, windowSeconds: 60 } as const satisfies RateLimitPolicy;
// Reads are normally cheap and paginated and go uncounted; analytics reads aggregate over whole windows, so they are counted.
export const analyticsReadPolicy = { name: "analytics-read", limit: 30, windowSeconds: 60 } as const satisfies RateLimitPolicy;
export const mcpPolicy = { name: "mcp", limit: 120, windowSeconds: 60 } as const satisfies RateLimitPolicy;
