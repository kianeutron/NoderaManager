import { Button, Stack } from "@mui/material";
import { documentSortValues } from "@/modules/library/domain/document-sort";
import type { LibraryFilters } from "@/modules/library/domain/document.schema";
import type { LibraryFacets } from "@/modules/library/domain/document.types";
import { FilterSelect } from "@/modules/library/ui/FilterSelect";
import { hasActiveFilters } from "@/modules/library/ui/library-url-state";

const sortLabels = { updated: "Recently updated", title: "Name A–Z" } as const satisfies Record<(typeof documentSortValues)[number], string>;
const sortOptions = documentSortValues.map((value) => ({ value, label: sortLabels[value] }));

type LibraryFilterBarProps = Readonly<{
  filters: LibraryFilters;
  facets: LibraryFacets | undefined;
  onChange: (patch: Partial<LibraryFilters>) => void;
  onClear: () => void;
}>;

export function LibraryFilterBar({ filters, facets, onChange, onClear }: LibraryFilterBarProps) {
  const tagOptions = facets?.tags.map((tag) => ({ value: tag.id, label: `${tag.name} (${tag.count})` })) ?? [];
  const folderOptions = facets?.folders.map((folder) => ({ value: folder.id, label: folder.name, indent: folder.depth })) ?? [];

  return (
    <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
      {tagOptions.length > 0 ? <FilterSelect allLabel="All tags" label="Tag" onChange={(value) => onChange({ tagId: value || undefined })} options={tagOptions} value={filters.tagId ?? ""} /> : null}
      {folderOptions.length > 0 ? <FilterSelect allLabel="All folders" label="Folder" onChange={(value) => onChange({ folderId: value || undefined })} options={folderOptions} value={filters.folderId ?? ""} /> : null}
      <FilterSelect label="Sort by" onChange={(value) => onChange({ sort: documentSortValues.find((sort) => sort === value) ?? "updated" })} options={sortOptions} value={filters.sort} />
      {hasActiveFilters(filters) ? <Button onClick={onClear} size="small">Clear filters</Button> : null}
    </Stack>
  );
}
