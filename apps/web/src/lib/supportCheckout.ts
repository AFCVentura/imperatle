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

export function guessCurrency(price: SupportPrice, timeZone: string | undefined): string | null {
  const amounts = price.amounts;
  if (!amounts) return null;
  const local = timeZone && BRAZIL_ZONES.has(timeZone) ? "brl" : timeZone && EURO_ZONES.has(timeZone) ? "eur" : null;
  if (local && local in amounts) return local;
  if (price.defaultCurrency && price.defaultCurrency in amounts) return price.defaultCurrency;
  return Object.keys(amounts)[0] ?? null;
}

// "R$ 9,90", "US$ 4.99", "€4.99"...
export function formatPrice(price: SupportPrice, currency: string | null, locale: string): string | null {
  const amount = currency ? price.amounts?.[currency] : undefined;
  if (currency === null || amount === undefined) return null;
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
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
