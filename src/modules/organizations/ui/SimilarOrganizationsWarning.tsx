import { Alert, Button, Stack, Typography } from "@mui/material";
import type { SimilarOrganization } from "@/modules/organizations/domain/organization.types";

type SimilarOrganizationsWarningProps = Readonly<{
  organizations: readonly SimilarOrganization[];
  onOpen: (organizationId: string) => void;
  onAddAnyway: () => void;
  pending: boolean;
}>;

/** A matching name is advisory: two real companies can share one, so the owner decides, and only after seeing who matched. */
export function SimilarOrganizationsWarning({ organizations, onOpen, onAddAnyway, pending }: SimilarOrganizationsWarningProps) {
  return (
    <Alert severity="warning">
      <Typography sx={{ fontWeight: 700 }} variant="body2">A company with this name already exists</Typography>
      <Stack sx={{ gap: 1, mt: 1 }}>
        {organizations.map((organization) => (
          <Stack direction="row" key={organization.organizationId} sx={{ alignItems: "center", gap: 1, justifyContent: "space-between" }}>
            <Typography variant="body2">{organization.name}</Typography>
            <Button onClick={() => onOpen(organization.organizationId)} size="small">Open</Button>
          </Stack>
        ))}
        <Button disabled={pending} onClick={onAddAnyway} sx={{ alignSelf: "flex-start" }} variant="outlined">It&apos;s a different company, add anyway</Button>
      </Stack>
    </Alert>
  );
}
