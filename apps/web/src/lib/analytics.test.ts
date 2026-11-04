import { describe, expect, it } from "vitest";
import { CLOUDFLARE_BEACON_SRC, cloudflareBeacon } from "./analytics";

describe("cloudflareBeacon", () => {
  it("builds the beacon script when a token is set", () => {
    const beacon = cloudflareBeacon("0123456789abcdef0123456789abcdef");
    expect(beacon).toEqual({
      src: CLOUDFLARE_BEACON_SRC,
      config: '{"token":"0123456789abcdef0123456789abcdef"}',
    });
    expect(beacon?.src).toBe("https://static.cloudflareinsights.com/beacon.min.js");
  });

  it("ignores surrounding whitespace", () => {
    expect(cloudflareBeacon("  abcdef0123456789  \n")?.config).toBe('{"token":"abcdef0123456789"}');
  });

  it("renders nothing without a token, such as local dev and CI", () => {
    expect(cloudflareBeacon(undefined)).toBeNull();
    expect(cloudflareBeacon("")).toBeNull();
    expect(cloudflareBeacon("   ")).toBeNull();
  });

  it("treats a malformed token as unset", () => {
    expect(cloudflareBeacon('abc"} onload="alert(1)')).toBeNull();
    expect(cloudflareBeacon("short")).toBeNull();
  });
});
