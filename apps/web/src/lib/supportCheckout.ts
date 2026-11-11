import { intlLocale } from "../i18n/locales";

// The Supporter purchase through the API and Stripe Checkout: the price to
// show in the dialog, and the hosted checkout page the "buy" button goes to.
// No Stripe key in the browser: the API creates the session.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Amounts in minor units per lowercase currency, e.g. { usd: 499, brl: 990 }.
export interface SupportPrice {
  available: boolean;
  defaultCurrency: string | null;
  amounts: Record<string, number> | null;
}

export const PRICE_UNAVAILABLE: SupportPrice = { available: false, defaultCurrency: null, amounts: null };

export async function fetchSupportPrice(): Promise<SupportPrice> {
  try {
    const res = await fetch(`${API_URL}/support/price`);
    if (!res.ok) return PRICE_UNAVAILABLE;
    return (await res.json()) as SupportPrice;
  } catch {
    return PRICE_UNAVAILABLE;
  }
}

// Stripe Checkout picks the currency from the buyer's location; the dialog
// can't see the IP, so it guesses from the time zone. Only a preview: the
// checkout page shows the amount actually charged.
const BRAZIL_ZONES = new Set([
  "America/Sao_Paulo", "America/Bahia", "America/Fortaleza", "America/Recife", "America/Belem", "America/Maceio",
  "America/Araguaina", "America/Santarem", "America/Manaus", "America/Cuiaba", "America/Campo_Grande",
  "America/Porto_Velho", "America/Boa_Vista", "America/Rio_Branco", "America/Eirunepe", "America/Noronha",
]);

const EURO_ZONES = new Set([
  "Europe/Amsterdam", "Europe/Andorra", "Europe/Athens", "Europe/Berlin", "Europe/Bratislava", "Europe/Brussels",
  "Europe/Busingen", "Europe/Dublin", "Europe/Helsinki", "Europe/Lisbon", "Europe/Ljubljana", "Europe/Luxembourg",
  "Europe/Madrid", "Europe/Malta", "Europe/Mariehamn", "Europe/Monaco", "Europe/Paris", "Europe/Podgorica",
  "Europe/Riga", "Europe/Rome", "Europe/San_Marino", "Europe/Tallinn", "Europe/Vatican", "Europe/Vienna",
  "Europe/Vilnius", "Europe/Zagreb", "Europe/Nicosia", "Asia/Nicosia", "Asia/Famagusta", "Atlantic/Azores",
  "Atlantic/Madeira", "Atlantic/Canary", "Africa/Ceuta",
]);

// The other currencies the price lists (see the Stripe price in stripe-setup.md).
// A currency the price doesn't list falls back to the default.
const OTHER_ZONES: Record<string, string> = {
  "Europe/London": "gbp", "Europe/Guernsey": "gbp", "Europe/Jersey": "gbp", "Europe/Isle_of_Man": "gbp",
  "America/Toronto": "cad", "America/Montreal": "cad", "America/Vancouver": "cad", "America/Edmonton": "cad",
  "America/Winnipeg": "cad", "America/Halifax": "cad", "America/St_Johns": "cad", "America/Regina": "cad",
  "America/Moncton": "cad", "America/Glace_Bay": "cad", "America/Goose_Bay": "cad", "America/Whitehorse": "cad",
  "America/Dawson": "cad", "America/Dawson_Creek": "cad", "America/Fort_Nelson": "cad", "America/Creston": "cad",
  "America/Iqaluit": "cad", "America/Rankin_Inlet": "cad", "America/Resolute": "cad", "America/Cambridge_Bay": "cad",
  "America/Inuvik": "cad", "America/Swift_Current": "cad", "America/Atikokan": "cad", "America/Blanc-Sablon": "cad",
  "America/Thunder_Bay": "cad", "America/Nipigon": "cad", "America/Rainy_River": "cad", "America/Yellowknife": "cad",
  "America/Pangnirtung": "cad",
  "America/Mexico_City": "mxn", "America/Cancun": "mxn", "America/Merida": "mxn", "America/Monterrey": "mxn",
  "America/Matamoros": "mxn", "America/Chihuahua": "mxn", "America/Ciudad_Juarez": "mxn", "America/Ojinaga": "mxn",
  "America/Mazatlan": "mxn", "America/Bahia_Banderas": "mxn", "America/Hermosillo": "mxn", "America/Tijuana": "mxn",
  "Asia/Tokyo": "jpy",
  "Asia/Kolkata": "inr", "Asia/Calcutta": "inr",
  "Europe/Istanbul": "try", "Asia/Istanbul": "try",
  "Europe/Warsaw": "pln",
  "Europe/Kyiv": "uah", "Europe/Kiev": "uah", "Europe/Uzhgorod": "uah", "Europe/Zaporozhye": "uah",
  "Europe/Bucharest": "ron",
  "Europe/Budapest": "huf",
  "Europe/Prague": "czk",
  "Asia/Almaty": "kzt", "Asia/Qostanay": "kzt", "Asia/Aqtobe": "kzt", "Asia/Aqtau": "kzt", "Asia/Atyrau": "kzt",
  "Asia/Oral": "kzt", "Asia/Qyzylorda": "kzt",
  "America/Argentina/Buenos_Aires": "ars", "America/Buenos_Aires": "ars", "America/Argentina/Cordoba": "ars",
  "America/Cordoba": "ars", "America/Argentina/Salta": "ars", "America/Argentina/Jujuy": "ars",
  "America/Argentina/Tucuman": "ars", "America/Argentina/Catamarca": "ars", "America/Argentina/La_Rioja": "ars",
  "America/Argentina/San_Juan": "ars", "America/Argentina/Mendoza": "ars", "America/Mendoza": "ars",
  "America/Argentina/San_Luis": "ars", "America/Argentina/Rio_Gallegos": "ars", "America/Argentina/Ushuaia": "ars",
  "America/Santiago": "clp", "America/Punta_Arenas": "clp", "Pacific/Easter": "clp",
  "America/Bogota": "cop",
  "America/Lima": "pen",
  "Asia/Seoul": "krw",
  "Asia/Manila": "php",
  "Asia/Jakarta": "idr", "Asia/Pontianak": "idr", "Asia/Makassar": "idr", "Asia/Jayapura": "idr",
  "Asia/Kuala_Lumpur": "myr", "Asia/Kuching": "myr",
  "Africa/Johannesburg": "zar",
};

function localCurrency(timeZone: string | undefined): string | null {
  if (!timeZone) return null;
  if (BRAZIL_ZONES.has(timeZone)) return "brl";
  if (EURO_ZONES.has(timeZone)) return "eur";
  if (timeZone.startsWith("Australia/")) return "aud";
  return OTHER_ZONES[timeZone] ?? null;
}

export function guessCurrency(price: SupportPrice, timeZone: string | undefined): string | null {
  const amounts = price.amounts;
  if (!amounts) return null;
  const local = localCurrency(timeZone);
  if (local && local in amounts) return local;
  if (price.defaultCurrency && price.defaultCurrency in amounts) return price.defaultCurrency;
  return Object.keys(amounts)[0] ?? null;
}

// "R$ 9,90", "US$ 4.99", "€4.99"...
// Stripe gives these in whole units (700 = ¥700), the rest in cents.
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export function formatPrice(price: SupportPrice, currency: string | null, locale: string): string | null {
  const amount = currency ? price.amounts?.[currency] : undefined;
  if (currency === null || amount === undefined) return null;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: currency.toUpperCase(),
    // The local sign ("$", "Ft", "₺") rather than a code like "CLP"; the
    // dollar keeps "US$" in Portuguese, where "$" alone could be anything.
    currencyDisplay: currency === "usd" ? "symbol" : "narrowSymbol",
    // "₺99", not "₺99.00".
    trailingZeroDisplay: "stripIfInteger",
  }).format(ZERO_DECIMAL.has(currency) ? amount : amount / 100);
}

export type CheckoutStart =
  | { kind: "redirect"; url: string }
  | { kind: "supporter" } // already bought: never charge again
  | { kind: "login" } // the session expired
  | { kind: "error" };

const STRIPE_CHECKOUT = /^https:\/\/checkout\.stripe\.com\//;

export async function startCheckout(locale: string): Promise<CheckoutStart> {
  try {
    const res = await fetch(`${API_URL}/support/checkout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    if (res.status === 409) return { kind: "supporter" };
    if (res.status === 401) return { kind: "login" };
    if (!res.ok) return { kind: "error" };
    const { url } = (await res.json()) as { url?: string };
    return url && STRIPE_CHECKOUT.test(url) ? { kind: "redirect", url } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
