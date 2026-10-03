import type { FolderPathItem, LibraryFolder } from "@/modules/library/domain/document.types";

/** Walks up from a folder to the root. Bounded by the folder count so corrupt data cannot loop forever. */
export function buildFolderPath(folders: readonly LibraryFolder[], folderId: string | null): readonly FolderPathItem[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: FolderPathItem[] = [];
  let current = folderId === null ? undefined : byId.get(folderId);

  while (current && path.length <= folders.length) {
    path.unshift({ id: current.id, name: current.name });
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }

  return path;
}

/** Depth-first order with alphabetical siblings, ready to render as an indented list. */
export function flattenFolderTree(folders: readonly LibraryFolder[]): readonly LibraryFolder[] {
  const childrenByParent = Map.groupBy(folders, (folder) => folder.parentId);
  const ordered: LibraryFolder[] = [];

  const visit = (parentId: string | null) => {
    const siblings = [...(childrenByParent.get(parentId) ?? [])].sort((left, right) => left.name.localeCompare(right.name));
    for (const folder of siblings) {
      ordered.push(folder);
      visit(folder.id);
    }
  };

  visit(null);
  return ordered;
}
