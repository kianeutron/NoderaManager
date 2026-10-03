import type { OrganizationRepository } from "@/modules/organizations/data/organization.repository";
import type { OrganizationDetail } from "@/modules/organizations/domain/organization.types";
import type { NoteRepository } from "@/modules/notes/data/note.repository";

type GetOrganizationDependencies = Readonly<{
  reads: Pick<OrganizationRepository, "findOrganizationIncludingArchived" | "listDomains" | "listPeople" | "listProspects">;
  notes: Pick<NoteRepository, "listNotes">;
}>;

const relatedLimit = 50;
const recentNoteLimit = 10;

export async function getOrganization({ reads, notes }: GetOrganizationDependencies, organizationId: string): Promise<OrganizationDetail | null> {
  const organization = await reads.findOrganizationIncludingArchived(organizationId);
  if (!organization) return null;

  const [domains, people, prospects, recentNotes] = await Promise.all([
    reads.listDomains(organizationId),
    reads.listPeople(organizationId, relatedLimit),
    reads.listProspects(organizationId, relatedLimit),
    notes.listNotes({ targetType: "organization", targetId: organizationId }, recentNoteLimit)
  ]);

  return {
    ...organization,
    archivedAt: organization.archivedAt?.toISOString() ?? null,
    updatedAt: organization.updatedAt.toISOString(),
    domains,
    people,
    prospects,
    recentNotes: recentNotes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() }))
  };
}
