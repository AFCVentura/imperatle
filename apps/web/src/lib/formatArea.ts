// PeakAreaKm2 is a plain integer -- only the thousands separator needs to
// respect locale (pt-BR uses ".", en-US uses ",").
export function formatAreaKm2(km2: number, locale: string, approximate: boolean): string {
  const formatter = new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US");
  const value = `${formatter.format(km2)} km²`;
  return approximate ? `~${value}` : value;
}
