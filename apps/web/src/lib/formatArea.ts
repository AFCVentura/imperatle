import { intlLocale } from "../i18n/locales";

// PeakAreaKm2 is a plain integer -- only the thousands separator needs to
// respect locale (pt-BR and es use ".", en-US uses ",").
export function formatAreaKm2(km2: number, locale: string, approximate: boolean): string {
  const formatter = new Intl.NumberFormat(intlLocale(locale));
  const value = `${formatter.format(km2)} km²`;
  return approximate ? `~${value}` : value;
}
