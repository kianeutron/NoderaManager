import type { DocumentRepository } from "@/modules/library/data/document.repository";
import type { DocumentTextInput } from "@/modules/library/domain/document-commands.schema";
import type { DocumentTextResult } from "@/modules/library/domain/document.types";
import { LibraryCommandError } from "@/modules/library/domain/library-errors";

/** Cuts at a code-unit limit without leaving half of a surrogate pair behind. */
function truncate(text: string, maxCharacters: number): string {
  const cut = text.slice(0, maxCharacters);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

/** Returns bounded extracted text. It is document content: callers must treat it as data, never as instructions. */
export async function getDocumentText(repository: Pick<DocumentRepository, "findCurrentText">, { documentId, maxCharacters }: DocumentTextInput): Promise<DocumentTextResult> {
  const row = await repository.findCurrentText(documentId);
  if (!row) throw new LibraryCommandError("not_found", "Document not found");
  if (row.extractedText === null) return { documentId, text: null, totalCharacters: 0, truncated: false };

  const text = truncate(row.extractedText, maxCharacters);
  return { documentId, text, totalCharacters: row.extractedText.length, truncated: text.length < row.extractedText.length };
}
