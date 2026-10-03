import { Chip, Stack } from "@mui/material";
import type { DocumentCategory } from "@/modules/library/domain/document.schema";
import type { LibraryFacets } from "@/modules/library/domain/document.types";
import { categoryMeta } from "@/modules/library/ui/document-presentation";

type CategoryChipsProps = Readonly<{
  facets: Pick<LibraryFacets, "categories" | "total">;
  value: DocumentCategory | undefined;
  onChange: (category: DocumentCategory | undefined) => void;
}>;

export function CategoryChips({ facets, value, onChange }: CategoryChipsProps) {
  // A category chosen through the URL stays visible even when it has no documents.
  const options = value && !facets.categories.some(({ category }) => category === value) ? [...facets.categories, { category: value, count: 0 }] : facets.categories;
  const choices = [{ category: undefined, label: "All", count: facets.total }, ...options.map(({ category, count }) => ({ category, label: categoryMeta[category].label, count }))];

  return (
    <Stack aria-label="Filter by category" direction="row" role="group" sx={{ flexWrap: { md: "wrap" }, gap: 1, overflowX: { xs: "auto", md: "visible" }, pb: { xs: 0.5, md: 0 } }}>
      {choices.map(({ category, label, count }) => {
        const selected = category === value;
        return <Chip aria-pressed={selected} clickable color={selected ? "primary" : "default"} key={category ?? "all"} label={`${label} · ${count}`} onClick={() => onChange(category)} sx={{ flexShrink: 0 }} variant={selected ? "filled" : "outlined"} />;
      })}
    </Stack>
  );
}
