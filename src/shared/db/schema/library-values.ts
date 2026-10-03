// Dependency-free on purpose: the browser needs these value lists, and importing them
// from `library.ts` would bundle Drizzle's Postgres builders into client code.
export const documentCategoryValues = [
  "proposal",
  "contract",
  "pitch_deck",
  "case_study",
  "one_pager",
  "portfolio",
  "research",
  "template",
  "report",
  "other"
] as const;
export const versionUploadStatusValues = ["pending", "uploaded", "failed"] as const;
export const extractionStatusValues = ["pending", "processing", "ready", "failed", "skipped"] as const;
export const documentLinkRelationValues = ["reference", "sent", "received"] as const;

/** Folder nesting is capped at four levels: depth 0 (root) through 3. Services compute depth from the parent. */
export const maxFolderDepth = 3;
