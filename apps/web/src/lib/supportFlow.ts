import type { MeResponse } from "./me";

// What the Supporter dialog shows, from who is signed in and whether the
// purchase is available (null = still asking the API). Kept apart from the
// component so it can be tested.
export type SupportView = "loading" | "supporter" | "login" | "buy" | "unavailable";

export function supportView(me: MeResponse | null, purchaseAvailable: boolean | null): SupportView {
  if (me === null) return "loading";
  if (me.authenticated && me.user?.isSupporter) return "supporter";
  if (purchaseAvailable === null) return "loading";
  if (!purchaseAvailable) return "unavailable";
  return me.authenticated ? "buy" : "login";
}

// After the Google login, or after leaving Stripe's checkout, the browser
// comes back with this query parameter: "1" reopens the Supporter dialog so
// the purchase can go on, "thanks" opens it on the thank-you.
export const SUPPORT_RETURN_PARAM = "support";
export const SUPPORT_THANKS = "thanks";

export function supportReturnUrl(currentHref: string): string {
  const url = new URL(currentHref);
  url.hash = "";
  url.searchParams.set(SUPPORT_RETURN_PARAM, "1");
  return url.toString();
}

// The current address without the parameter (to clean it once the dialog
// reopened) and whether it was the post-payment return, or null when the
// parameter isn't there.
export function readSupportReturn(currentHref: string): { clean: string; thanks: boolean } | null {
  const url = new URL(currentHref);
  const value = url.searchParams.get(SUPPORT_RETURN_PARAM);
  if (value === null) return null;
  url.searchParams.delete(SUPPORT_RETURN_PARAM);
  return { clean: url.toString(), thanks: value === SUPPORT_THANKS };
}

// The webhook can land a few seconds after Stripe sends the buyer back, so
// /me is asked again a few times before giving up (the thank-you message
// still shows; the perks appear on the next visit).
export async function waitForSupporter(
  refresh: () => Promise<MeResponse>,
  { attempts = 6, delayMs = 2000, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)) } = {},
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const me = await refresh();
    if (me.user?.isSupporter) return true;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return false;
}
