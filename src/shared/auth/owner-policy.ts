import { normalizeEmail } from "@/modules/people/domain/identity-normalization";

export function isOwnerEmail(email: string, ownerEmail: string): boolean {
  return normalizeEmail(email) === normalizeEmail(ownerEmail);
}
