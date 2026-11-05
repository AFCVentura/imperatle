// Page view analytics: Cloudflare Web Analytics, a cookieless JS beacon (no
// consent banner needed). It works without the domain's DNS being on
// Cloudflare: the beacon just posts page views to cloudflareinsights.com.
//
// The site token comes from NEXT_PUBLIC_CF_ANALYTICS_TOKEN, inlined by
// "next build" (a Docker build argument fed from a GitHub repository variable,
// see docs/launch/front-container-apps.md). Not set, nothing is rendered: local
// dev, CI and test builds send no page views.
export const CLOUDFLARE_BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

export interface CloudflareBeacon {
  src: string;
  /** Value of the script's data-cf-beacon attribute. */
  config: string;
}

// Site tokens are plain alphanumeric strings (32 hex characters today).
// Anything else is treated as unset, so a typo can't break the page markup.
const TOKEN_PATTERN = /^[A-Za-z0-9]{8,128}$/;

export function cloudflareBeacon(token: string | undefined): CloudflareBeacon | null {
  const trimmed = token?.trim();
  if (!trimmed || !TOKEN_PATTERN.test(trimmed)) {
    return null;
  }
  return { src: CLOUDFLARE_BEACON_SRC, config: JSON.stringify({ token: trimmed }) };
}
