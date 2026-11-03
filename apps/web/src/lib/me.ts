import { useCallback, useEffect, useState } from "react";

// TEMPORARY version from the support feature: the accounts feature owns this
// file (same names and response type, see LAUNCH-SPEC.md). GET /me answers
// who is signed in; a failure counts as signed out, so the game never breaks.

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface MeUser {
  id: string;
  displayName: string;
  email: string;
  isSupporter: boolean;
}

export interface MeResponse {
  authenticated: boolean;
  user: MeUser | null;
}

export const SIGNED_OUT: MeResponse = { authenticated: false, user: null };

// Fired after anything that may change /me (a purchase, login, logout), so
// every useMe() on the page reloads it.
export const ME_CHANGED_EVENT = "imperatle:me-changed";

export async function getMe(): Promise<MeResponse> {
  try {
    const res = await fetch(`${API_URL}/me`, { cache: "no-store", credentials: "include" });
    if (!res.ok) return SIGNED_OUT;
    return (await res.json()) as MeResponse;
  } catch {
    return SIGNED_OUT;
  }
}

export function notifyMeChanged() {
  window.dispatchEvent(new Event(ME_CHANGED_EVENT));
}

// Google login runs in the API; it sends the browser back to returnUrl.
export function loginUrl(returnUrl: string): string {
  return `${API_URL}/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

// me is null while the first request is in flight.
export function useMe(): { me: MeResponse | null; refresh: () => Promise<MeResponse> } {
  const [me, setMe] = useState<MeResponse | null>(null);

  const refresh = useCallback(async () => {
    const next = await getMe();
    setMe(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getMe().then((next) => {
        if (!cancelled) setMe(next);
      });
    load();
    window.addEventListener(ME_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(ME_CHANGED_EVENT, load);
    };
  }, []);

  return { me, refresh };
}
