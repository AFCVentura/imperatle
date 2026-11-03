import type { MeResponse } from "./me";

// What the Supporter dialog shows, from who is signed in and whether Paddle
// is configured. Kept apart from the component so it can be tested.
export type SupportView = "loading" | "supporter" | "login" | "buy" | "unavailable";

export function supportView(me: MeResponse | null, paddleConfigured: boolean): SupportView {
  if (me === null) return "loading";
  if (me.authenticated && me.user?.isSupporter) return "supporter";
  if (!paddleConfigured) return "unavailable";
  return me.authenticated ? "buy" : "login";
}

// After the Google login the API sends the browser back here; this query
// parameter reopens the Supporter dialog so the purchase can go on.
export const SUPPORT_RETURN_PARAM = "support";

export function supportReturnUrl(currentHref: string): string {
  const url = new URL(currentHref);
  url.hash = "";
  url.searchParams.set(SUPPORT_RETURN_PARAM, "1");
  return url.toString();
}

// The current address without the parameter (to clean it once the dialog
// reopened), or null when the parameter isn't there.
export function withoutSupportReturn(currentHref: string): string | null {
  const url = new URL(currentHref);
  if (!url.searchParams.has(SUPPORT_RETURN_PARAM)) return null;
  url.searchParams.delete(SUPPORT_RETURN_PARAM);
  return url.toString();
}

// The webhook can land a few seconds after Paddle's "checkout completed", so
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
