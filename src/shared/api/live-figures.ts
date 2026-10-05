/**
 * The root key of every query that summarises everything (the overview and analytics). Any successful write can change
 * those figures, so the query client marks them stale after each one (`createQueryClient`), and they can be cached between
 * writes without ever lagging behind one.
 */
export const liveFiguresKey = ["analytics"] as const;
