import { describe, expect, it, vi } from "vitest";
import type { PricePreviewResponse } from "@paddle/paddle-js";
import type { MeResponse } from "./me";
import { formattedSupporterPrice, readPaddleConfig } from "./paddle";
import { supportReturnUrl, supportView, waitForSupporter, withoutSupportReturn } from "./supportFlow";

const signedOut: MeResponse = { authenticated: false, user: null };
const user = (isSupporter: boolean): MeResponse => ({
  authenticated: true,
  user: { id: "u1", displayName: "Ana", email: "ana@example.com", isSupporter },
});

describe("supportView", () => {
  it("waits for /me", () => {
    expect(supportView(null, true)).toBe("loading");
  });

  it("asks to log in before buying", () => {
    expect(supportView(signedOut, true)).toBe("login");
  });

  it("offers the purchase to a signed-in player", () => {
    expect(supportView(user(false), true)).toBe("buy");
  });

  it("thanks a supporter instead of selling again, even without Paddle configured", () => {
    expect(supportView(user(true), true)).toBe("supporter");
    expect(supportView(user(true), false)).toBe("supporter");
  });

  it("says it's unavailable when Paddle isn't configured", () => {
    expect(supportView(signedOut, false)).toBe("unavailable");
    expect(supportView(user(false), false)).toBe("unavailable");
  });
});

describe("return url after login", () => {
  it("adds the parameter and keeps the rest of the address", () => {
    expect(supportReturnUrl("https://imperatle.com/pt?x=1#top")).toBe("https://imperatle.com/pt?x=1&support=1");
  });

  it("removes it again, or says it isn't there", () => {
    expect(withoutSupportReturn("https://imperatle.com/pt?x=1&support=1")).toBe("https://imperatle.com/pt?x=1");
    expect(withoutSupportReturn("https://imperatle.com/pt")).toBeNull();
  });
});

describe("readPaddleConfig", () => {
  it("needs the client token and the price id", () => {
    expect(readPaddleConfig({})).toBeNull();
    expect(readPaddleConfig({ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_x" })).toBeNull();
  });

  it("defaults to sandbox and only switches to production when told", () => {
    const base = { NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_x", NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID: "pri_1" };
    expect(readPaddleConfig(base)).toEqual({ clientToken: "test_x", priceId: "pri_1", environment: "sandbox" });
    expect(readPaddleConfig({ ...base, NEXT_PUBLIC_PADDLE_ENVIRONMENT: "live" })?.environment).toBe("sandbox");
    expect(readPaddleConfig({ ...base, NEXT_PUBLIC_PADDLE_ENVIRONMENT: "production" })?.environment).toBe("production");
  });
});

describe("formattedSupporterPrice", () => {
  it("reads the localized total of the first line", () => {
    const preview = {
      data: { details: { lineItems: [{ formattedTotals: { subtotal: "R$ 16,30", discount: "R$ 0,00", tax: "R$ 3,60", total: "R$ 19,90" } }] } },
    } as unknown as PricePreviewResponse;
    expect(formattedSupporterPrice(preview)).toBe("R$ 19,90");
  });

  it("is null without a preview", () => {
    expect(formattedSupporterPrice(null)).toBeNull();
    expect(formattedSupporterPrice({ data: { details: { lineItems: [] } } } as unknown as PricePreviewResponse)).toBeNull();
  });
});

describe("waitForSupporter", () => {
  const noSleep = { sleep: () => Promise.resolve() };

  it("stops as soon as /me says supporter", async () => {
    const refresh = vi.fn<() => Promise<MeResponse>>()
      .mockResolvedValueOnce(user(false))
      .mockResolvedValueOnce(user(true));
    expect(await waitForSupporter(refresh, noSleep)).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("gives up after the attempts", async () => {
    const refresh = vi.fn<() => Promise<MeResponse>>().mockResolvedValue(user(false));
    expect(await waitForSupporter(refresh, { ...noSleep, attempts: 3 })).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});
