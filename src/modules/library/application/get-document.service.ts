import { toDocumentDetail } from "@/modules/library/application/document-views";
import type { DocumentRepository } from "@/modules/library/data/document.repository";
import type { DocumentDetail } from "@/modules/library/domain/document.types";

type GetDocumentRepository = Pick<DocumentRepository, "findDocument" | "listTagNames" | "listVersions" | "listLinks" | "listFolders">;

export async function getDocument(repository: GetDocumentRepository, id: string): Promise<DocumentDetail | null> {
  const row = await repository.findDocument(id);
  if (!row) return null;

  const [tagNames, versions, links, folders] = await Promise.all([
    repository.listTagNames([id]),
    repository.listVersions(id),
    repository.listLinks(id),
    repository.listFolders()
  ]);

  return toDocumentDetail({ row, tagNames: tagNames.get(id) ?? [], versions, links, folders });
}
