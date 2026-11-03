import type { MeResponse } from "./me";

// Off until the game actually runs ads (AdSense is out of scope for the
// launch). Kept as a constant so the build drops the slot entirely.
export const ADS_ENABLED = false;

// Never for supporters, never while /me is loading (null), only when ads are on.
export function shouldShowAd(me: MeResponse | null, adsEnabled: boolean): boolean {
  if (!adsEnabled || me === null) return false;
  return !me.user?.isSupporter;
}
