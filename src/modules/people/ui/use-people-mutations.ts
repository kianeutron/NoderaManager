"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreatePersonInput, PersonChanges, SetPersonLinksInput } from "@/modules/people/domain/person.schema";
import type { PersonIdentityInput } from "@/modules/people/domain/person.schema";
import { checkPersonDuplicates, clearPersonDoNotContact, createPerson, markPersonDoNotContact, setPersonArchived, setPersonEmails, setPersonLinks, updatePerson } from "@/modules/people/ui/people-api";
import { peopleKeys } from "@/modules/people/ui/use-people-queries";

/** Lists and details are refetched after every write, even a failed one: a partly applied edit must not leave stale data on screen. */
function useInvalidatePeople() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: peopleKeys.all });
}

/** Read-only, so it needs no invalidation; it is a mutation only so its pending and failed states are tracked like the saves around it. */
export function useCheckPersonDuplicates() {
  return useMutation({ mutationFn: (identity: PersonIdentityInput) => checkPersonDuplicates(identity) });
}

type Links = SetPersonLinksInput["links"];

/** The person and their links are separate commands, so the links follow once the person exists. */
export function useCreatePerson() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: async ({ input, links }: Readonly<{ input: CreatePersonInput; links: Links }>) => {
      const result = await createPerson(input);
      if (links.length > 0) await setPersonLinks(result.personId, links);
      return result;
    },
    onSettled: invalidate
  });
}

export type PersonEdit = Readonly<{ personId: string; changes: PersonChanges | null; emails: string[] | null; links: Links | null }>;

/** Fields, emails and links are separate commands, so they run in turn; each is skipped when nothing changed. */
export function useUpdatePerson() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: async ({ personId, changes, emails, links }: PersonEdit) => {
      if (changes) await updatePerson(personId, changes);
      if (emails) await setPersonEmails(personId, emails);
      if (links) await setPersonLinks(personId, links);
    },
    onSettled: invalidate
  });
}

export function useSetDoNotContact() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: ({ personId, reason }: Readonly<{ personId: string; reason: string | null }>) => reason === null ? clearPersonDoNotContact(personId) : markPersonDoNotContact(personId, reason),
    onSettled: invalidate
  });
}

export function useSetPersonArchived() {
  const invalidate = useInvalidatePeople();
  return useMutation({ mutationFn: ({ personId, archive }: Readonly<{ personId: string; archive: boolean }>) => setPersonArchived(personId, archive), onSettled: invalidate });
}
