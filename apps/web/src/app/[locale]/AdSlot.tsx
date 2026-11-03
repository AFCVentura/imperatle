"use client";

import { ADS_ENABLED, shouldShowAd } from "@/lib/ads";
import { useMe } from "@/lib/me";

// Reserved place for an ad (Supporter perk: "no ads"). There are no ads yet,
// so this renders nothing for everyone; it only marks where one would go.
// When ads arrive: set ADS_ENABLED in lib/ads.ts and render the ad unit
// below. Supporters keep getting nothing, and nothing shows while /me is
// still loading, so a supporter never sees an ad flash in.
export function AdSlot({ placement }: { placement: "footer" }) {
  const me = useMe();
  if (!shouldShowAd(me, ADS_ENABLED)) return null;
  return <div data-ad-slot={placement} aria-hidden className="mx-auto w-full max-w-md" />;
}
