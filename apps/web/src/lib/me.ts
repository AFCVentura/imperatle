import { useEffect, useSyncExternalStore } from "react";
import { clearAllGameProgress } from "./gameStorage";
import { savePracticeRound } from "./practiceStorage";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// GET /me on the API. Accounts are optional: a signed-out player gets
// { authenticated: false, user: null } and plays exactly as before.
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

// In the browser the login cookie goes along by itself (credentials). On the
// server (a Server Component), pass the incoming request's Cookie header,
// which carries the login cookie when Auth:CookieDomain covers the web app.
export async function getMe(options: { cookie?: string } = {}): Promise<MeResponse> {
  const res = await fetch(`${API_URL}/me`, {
    cache: "no-store",
    credentials: "include",
    headers: options.cookie ? { cookie: options.cookie } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to load the account: ${res.status}`);
  return res.json();
}

// Where "Sign in with Google" goes: the API starts the login and sends the
// browser back to returnUrl (it only accepts the web app's own origins).
export function googleLoginUrl(returnUrl: string): string {
  return `${API_URL}/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

// One shared copy of /me for every component (header, dialogs), loaded once
// per page and updated after logout or deletion.
let current: MeResponse | null = null;
let pending: Promise<MeResponse> | null = null;
const listeners = new Set<() => void>();

function set(me: MeResponse) {
  current = me;
  listeners.forEach((listener) => listener());
}

// Reloads /me. A failure (API down, network) counts as signed out: the game
// never depends on the account.
export function refreshMe(): Promise<MeResponse> {
  pending ??= getMe()
    .catch(() => SIGNED_OUT)
    .then((me) => {
      set(me);
      return me;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function getMeSnapshot(): MeResponse | null {
  return current;
}

export function subscribeMe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// null while loading (and during server rendering).
export function useMe(): MeResponse | null {
  const me = useSyncExternalStore(subscribeMe, getMeSnapshot, () => null);

  useEffect(() => {
    if (getMeSnapshot() === null) void refreshMe();
  }, []);

  return me;
}

// The browser's display copies of the account's games (today's board, the
// practice round in progress). After logout or deletion the API hands this
// browser a fresh anonymous id, so those copies belong to someone else now:
// on a shared computer the next person shouldn't see them, even for the
// moment before the server's empty round replaces them.
function forgetLocalGames() {
  clearAllGameProgress();
  savePracticeRound(null);
}

export async function logout(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => null);
  if (!res?.ok) return false;
  forgetLocalGames();
  set(SIGNED_OUT);
  return true;
}

// LGPD/GDPR: deletes the account and every game linked to it.
export async function deleteAccount(): Promise<boolean> {
  const res = await fetch(`${API_URL}/me`, { method: "DELETE", credentials: "include" }).catch(() => null);
  if (!res?.ok) return false;
  forgetLocalGames();
  set(SIGNED_OUT);
  return true;
}

// Tests only.
export function resetMeStore(): void {
  current = null;
  pending = null;
  listeners.clear();
}
