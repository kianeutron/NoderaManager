import { Box, Skeleton, Stack } from "@mui/material";
import type { ReactNode } from "react";

type EntityListProps<Item extends Readonly<{ id: string }>> = Readonly<{
  label: string;
  items: readonly Item[];
  renderRow: (item: Item) => ReactNode;
}>;

/** A vertical list of selectable rows. Each row renders itself; this only supplies the list semantics and spacing. */
export function EntityList<Item extends Readonly<{ id: string }>>({ label, items, renderRow }: EntityListProps<Item>) {
  return (
    <Stack aria-label={label} component="ul" role="list" sx={{ gap: 1, listStyle: "none", m: 0, p: 0 }}>
      {items.map((item) => <Box component="li" key={item.id}>{renderRow(item)}</Box>)}
    </Stack>
  );
}

export function EntityListSkeleton({ count }: Readonly<{ count: number }>) {
  return (
    <Stack aria-hidden sx={{ gap: 1 }}>
      {Array.from({ length: count }, (_, index) => <Skeleton height={68} key={index} sx={{ transform: "none" }} variant="rounded" />)}
    </Stack>
  );
}
