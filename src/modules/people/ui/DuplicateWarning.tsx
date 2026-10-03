import { Alert, Button, Stack, Typography } from "@mui/material";
import type { DuplicateCandidate } from "@/modules/people/domain/person.types";

type DuplicateWarningProps = Readonly<{
  candidates: readonly DuplicateCandidate[];
  /** Set for a strong match: the owner may confirm this is a different person. Exact matches can only be opened. */
  onCreateAnyway: (() => void) | null;
  onOpen: (personId: string) => void;
  pending: boolean;
}>;

/** Names the existing people and why they match, rather than a vague "possible duplicate". */
export function DuplicateWarning({ candidates, onCreateAnyway, onOpen, pending }: DuplicateWarningProps) {
  const isBlocked = onCreateAnyway === null;

  return (
    <Alert severity={isBlocked ? "error" : "warning"}>
      <Typography sx={{ fontWeight: 700 }} variant="body2">{isBlocked ? "This person already exists" : "This may be someone you already have"}</Typography>
      <Stack sx={{ gap: 1, mt: 1 }}>
        {candidates.map((candidate) => (
          <Stack direction="row" key={candidate.personId} sx={{ alignItems: "center", gap: 1, justifyContent: "space-between" }}>
            <Typography variant="body2">{candidate.fullName}{candidate.organizationName ? ` · ${candidate.organizationName}` : ""} — {candidate.reason.toLowerCase()}</Typography>
            <Button onClick={() => onOpen(candidate.personId)} size="small">Open</Button>
          </Stack>
        ))}
        {onCreateAnyway ? <Button disabled={pending} onClick={onCreateAnyway} sx={{ alignSelf: "flex-start" }} variant="outlined">They are different people, add anyway</Button> : null}
      </Stack>
    </Alert>
  );
}
