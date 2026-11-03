import { describe, expect, it } from "vitest";
import { shouldShowAd } from "./ads";
import { SIGNED_OUT, type MeResponse } from "./me";

const signedIn = (isSupporter: boolean): MeResponse => ({
  authenticated: true,
  user: { id: "u", displayName: "Ana", email: "ana@example.com", isSupporter },
});

describe("shouldShowAd", () => {
  it("shows nothing while ads are off, for everyone", () => {
    expect(shouldShowAd(SIGNED_OUT, false)).toBe(false);
    expect(shouldShowAd(signedIn(false), false)).toBe(false);
  });

  it("never shows an ad to a supporter or before /me loads", () => {
    expect(shouldShowAd(signedIn(true), true)).toBe(false);
    expect(shouldShowAd(null, true)).toBe(false);
  });

  it("would show one to everyone else once ads are on", () => {
    expect(shouldShowAd(SIGNED_OUT, true)).toBe(true);
    expect(shouldShowAd(signedIn(false), true)).toBe(true);
  });
});
