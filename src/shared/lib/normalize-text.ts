/** Comparison key for names and labels: "Q3  Deck" and "q3 deck" match. Display text keeps the user's spelling. */
export function normalizeText(text: string): string {
  return text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}
