import { describe, expect, it } from "vitest";
import { vercelAnalyticsEnabled } from "./analytics";

describe("vercelAnalyticsEnabled", () => {
  it("is on when the site runs on Vercel", () => {
    expect(vercelAnalyticsEnabled({ VERCEL: "1" })).toBe(true);
  });

  it("is off anywhere else, such as the Docker image", () => {
    expect(vercelAnalyticsEnabled({})).toBe(false);
    expect(vercelAnalyticsEnabled({ VERCEL: "" })).toBe(false);
    expect(vercelAnalyticsEnabled({ NODE_ENV: "production" })).toBe(false);
  });
});
