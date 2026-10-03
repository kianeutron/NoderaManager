import type { DocumentRepository } from "@/modules/library/data/document.repository";
import type { LibraryFacets } from "@/modules/library/domain/document.types";
import { flattenFolderTree } from "@/modules/library/domain/folder-path";

type FacetsRepository = Pick<DocumentRepository, "countByCategory" | "countByTag" | "listFolders">;

export async function getLibraryFacets(repository: FacetsRepository): Promise<LibraryFacets> {
  const [categories, tags, folders] = await Promise.all([repository.countByCategory(), repository.countByTag(), repository.listFolders()]);

  return {
    total: categories.reduce((sum, row) => sum + row.count, 0),
    categories: categories.toSorted((left, right) => right.count - left.count || left.category.localeCompare(right.category)),
    tags,
    folders: flattenFolderTree(folders)
  };
}
