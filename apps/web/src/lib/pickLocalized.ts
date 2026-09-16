export function pickLocalized(en: string, pt: string, locale: string): string {
  return locale === "pt" ? pt : en;
}
