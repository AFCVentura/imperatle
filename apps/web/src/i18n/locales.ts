// The game's languages, shared by routing and by code that formats per
// language. Adding one here also needs its messages/<locale>.json.
export const LOCALES = ["en", "pt", "es"] as const;

export type Locale = (typeof LOCALES)[number];

// BCP 47 tag for Intl formatting (numbers, dates, prices). Spanish is the
// neutral "es" (no country), like the translation itself.
const INTL_TAGS: Record<Locale, string> = { en: "en-US", pt: "pt-BR", es: "es" };

export function intlLocale(locale: string): string {
  return INTL_TAGS[locale as Locale] ?? INTL_TAGS.en;
}
