import type { PersonRepository } from "@/modules/people/data/person.repository";
import { classifyCandidates, getDuplicateLookupKeys, type IdentityFields } from "@/modules/people/domain/duplicate-candidates";
import type { DuplicateCandidate } from "@/modules/people/domain/person.types";

/** The single duplicate check every creation path shares (UI, imports, API, MCP): docs/02-data/04-deduplication.md. */
export async function findDuplicateCandidates(repository: Pick<PersonRepository, "findIdentityMatches">, identity: IdentityFields): Promise<DuplicateCandidate[]> {
  const lookup = getDuplicateLookupKeys(identity);
  return classifyCandidates(await repository.findIdentityMatches(lookup), lookup);
}
