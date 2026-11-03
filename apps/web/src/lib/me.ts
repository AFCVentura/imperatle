"use client";

import { useEffect, useState } from "react";

// GET /me, per the launch spec. Placeholder until the accounts branch brings
// the real one: same name and response type, so callers don't change.
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const ANONYMOUS_ME: MeResponse = { authenticated: false, user: null };

export async function getMe(): Promise<MeResponse> {
  try {
    const res = await fetch(`${API_URL}/me`, { cache: "no-store", credentials: "include" });
    if (!res.ok) return ANONYMOUS_ME;
    return (await res.json()) as MeResponse;
  } catch {
    return ANONYMOUS_ME;
  }
}

// null while loading. Failures count as "not logged in": the game itself
// never depends on an account.
export function useMe(): MeResponse | null {
  const [me, setMe] = useState<MeResponse | null>(null);
  useEffect(() => {
    let current = true;
    getMe().then((m) => current && setMe(m));
    return () => {
      current = false;
    };
  }, []);
  return me;
}
