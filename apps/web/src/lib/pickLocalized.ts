// The text in the player's language. Spanish is optional (content not yet
// translated, or progress saved before Spanish existed): empty or missing
// falls back to English.
export function pickLocalized(en: string, pt: string, locale: string, es?: string | null): string {
  if (locale === "pt") return pt;
  if (locale === "es") return es || en;
  return en;
}
