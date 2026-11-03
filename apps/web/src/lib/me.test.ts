import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAccount,
  getMe,
  getMeSnapshot,
  googleLoginUrl,
  logout,
  refreshMe,
  resetMeStore,
  SIGNED_OUT,
  subscribeMe,
  type MeResponse,
} from "./me";

const signedIn: MeResponse = {
  authenticated: true,
  user: { id: "8b1c", displayName: "Ana", email: "ana@example.com", isSupporter: false },
};

const fetchMock = vi.fn();

function respond(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

beforeEach(() => {
  resetMeStore();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getMe", () => {
  it("asks /me with the cookies and returns the response", async () => {
    respond(200, signedIn);

    expect(await getMe()).toEqual(signedIn);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/me$/);
    expect(init).toMatchObject({ credentials: "include", cache: "no-store" });
    expect(init.headers).toBeUndefined();
  });

  it("forwards a cookie header when called on the server", async () => {
    respond(200, SIGNED_OUT);

    await getMe({ cookie: "imperatle_session=abc" });

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ cookie: "imperatle_session=abc" });
  });

  it("throws on an error status", async () => {
    respond(500);

    await expect(getMe()).rejects.toThrow("500");
  });
});

describe("the shared /me store", () => {
  it("starts empty, loads once for simultaneous callers and notifies", async () => {
    const listener = vi.fn();
    subscribeMe(listener);
    respond(200, signedIn);

    expect(getMeSnapshot()).toBeNull();
    const [a, b] = await Promise.all([refreshMe(), refreshMe()]);

    expect(a).toEqual(signedIn);
    expect(b).toEqual(signedIn);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getMeSnapshot()).toEqual(signedIn);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("treats a failure as signed out, so the game never waits on accounts", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network"));

    expect(await refreshMe()).toEqual(SIGNED_OUT);
    expect(getMeSnapshot()).toEqual(SIGNED_OUT);
  });

  it("is signed out after a successful logout", async () => {
    respond(200, signedIn);
    await refreshMe();
    respond(204);

    expect(await logout()).toBe(true);

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/auth\/logout$/);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(getMeSnapshot()).toEqual(SIGNED_OUT);
  });

  it("signs out of all devices through ?all=true", async () => {
    respond(200, signedIn);
    await refreshMe();
    respond(204);

    expect(await logout({ allDevices: true })).toBe(true);

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/auth\/logout\?all=true$/);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(getMeSnapshot()).toEqual(SIGNED_OUT);
  });

  it("forgets this browser's copies of the account's games on logout and deletion, not on failure", async () => {
    const store = new Map<string, string>();
    const localStorage = {
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    vi.stubGlobal("window", { localStorage });
    const fill = () => {
      store.set("imperatle:progress:2026-11-03", "{}");
      store.set("imperatle:practice:round", "{}");
      store.set("imperatle:practice:options", "{}");
    };

    fill();
    respond(500);
    expect(await logout()).toBe(false);
    expect(store.size).toBe(3);

    respond(204);
    expect(await logout()).toBe(true);
    // The practice options are a preference, not a game: they stay.
    expect([...store.keys()]).toEqual(["imperatle:practice:options"]);

    fill();
    respond(204);
    expect(await deleteAccount()).toBe(true);
    expect([...store.keys()]).toEqual(["imperatle:practice:options"]);
  });

  it("keeps the user when deletion fails, and drops it when it works", async () => {
    respond(200, signedIn);
    await refreshMe();

    respond(403);
    expect(await deleteAccount()).toBe(false);
    expect(getMeSnapshot()).toEqual(signedIn);

    respond(204);
    expect(await deleteAccount()).toBe(true);
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "DELETE", credentials: "include" });
    expect(getMeSnapshot()).toEqual(SIGNED_OUT);
  });
});

describe("googleLoginUrl", () => {
  it("encodes the page to come back to", () => {
    expect(googleLoginUrl("https://imperatle.com/pt?x=1")).toMatch(
      /\/auth\/google\/login\?returnUrl=https%3A%2F%2Fimperatle\.com%2Fpt%3Fx%3D1$/,
    );
  });
});
