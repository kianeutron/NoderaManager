/** Email identity key: trimmed and lowercased. The local part is kept as written apart from case (no plus-address stripping). */
export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("en-US");
}
