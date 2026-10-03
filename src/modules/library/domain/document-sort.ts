export const documentSortValues = ["updated", "title"] as const;
export type DocumentSort = (typeof documentSortValues)[number];
