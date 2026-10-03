"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Skeleton, Stack } from "@mui/material";
import type { ReactNode } from "react";
import { ApiRequestError } from "@/shared/api/api-request-error";
import { ErrorState } from "@/shared/ui/ErrorState";
import { PreviewFrame } from "@/shared/ui/PreviewFrame";

type PreviewQueryBoundaryProps<Data> = Readonly<{
  query: UseQueryResult<Data, Error>;
  noun: string;
  onClose: () => void;
  /** Renders the loaded record inside its own frame, so it can add a footer. */
  children: (data: Data) => ReactNode;
}>;

/** Loading, "no longer exists" and error states of a preview, each inside the standard frame so the close button is always there. */
export function PreviewQueryBoundary<Data>({ query, noun, onClose, children }: PreviewQueryBoundaryProps<Data>) {
  if (query.isPending) {
    return (
      <PreviewFrame onClose={onClose}>
        <Stack aria-busy aria-label={`Loading ${noun}`} sx={{ gap: 2 }}>
          <Skeleton height={56} variant="rounded" />
          <Skeleton height={20} width="60%" />
          <Skeleton height={120} variant="rounded" />
        </Stack>
      </PreviewFrame>
    );
  }

  if (query.isError) {
    const isGone = query.error instanceof ApiRequestError && query.error.status === 404;
    const description = isGone ? `This ${noun} no longer exists.` : `The ${noun} could not be loaded.`;
    const title = isGone ? "Not found" : "Something went wrong";
    return (
      <PreviewFrame onClose={onClose}>
        {isGone ? <ErrorState description={description} title={title} /> : <ErrorState description={description} onRetry={() => void query.refetch()} title={title} />}
      </PreviewFrame>
    );
  }

  return <>{children(query.data)}</>;
}
