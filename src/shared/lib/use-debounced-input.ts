"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A text input that reports its value after the user pauses typing.
 * `committed` is the value owned elsewhere (for example the URL); it is adopted again only when
 * it changes for a reason other than this input's own commit, such as a "clear filters" button.
 */
export function useDebouncedInput(committed: string, onCommit: (value: string) => void, delayMs = 300) {
  const [draft, setDraft] = useState(committed);
  const lastCommitted = useRef(committed);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    if (committed !== lastCommitted.current) {
      lastCommitted.current = committed;
      setDraft(committed);
    }
  }, [committed]);

  useEffect(() => {
    if (draft === lastCommitted.current) return;
    const timer = setTimeout(() => {
      lastCommitted.current = draft;
      onCommitRef.current(draft);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [draft, delayMs]);

  return [draft, setDraft] as const;
}
