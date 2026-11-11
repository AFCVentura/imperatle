import { afterEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "./me";
import { type SupportPrice, formatPrice, guessCurrency, startCheckout } from "./supportCheckout";
import { readSupportReturn, supportReturnUrl, supportView, waitForSupporter } from "./supportFlow";

const signedOut: MeResponse = { authenticated: false, user: null };
const user = (isSupporter: boolean): MeResponse => ({
  authenticated: true,
  user: { id: "u1", displayName: "Ana", email: "ana@example.com", isSupporter },
});

describe("supportView", () => {
  it("waits for /me and for the price", () => {
    expect(supportView(null, true)).toBe("loading");
    expect(supportView(user(false), null)).toBe("loading");
  });

  it("asks to log in before buying", () => {
    expect(supportView(signedOut, true)).toBe("login");
  });

  it("offers the purchase to a signed-in player", () => {
    expect(supportView(user(false), true)).toBe("buy");
  });

  it("thanks a supporter instead of selling again, even without the purchase available", () => {
    expect(supportView(user(true), true)).toBe("supporter");
    expect(supportView(user(true), false)).toBe("supporter");
    expect(supportView(user(true), null)).toBe("supporter");
  });

  it("says it's unavailable when the purchase isn't configured", () => {
    expect(supportView(signedOut, false)).toBe("unavailable");
    expect(supportView(user(false), false)).toBe("unavailable");
  });
});

describe("return url after login or payment", () => {
  it("adds the parameter and keeps the rest of the address", () => {
    expect(supportReturnUrl("https://imperatle.com/pt?x=1#top")).toBe("https://imperatle.com/pt?x=1&support=1");
  });

  it("removes it again and tells a payment return apart, or says it isn't there", () => {
    expect(readSupportReturn("https://imperatle.com/pt?x=1&support=1")).toEqual({ clean: "https://imperatle.com/pt?x=1", thanks: false });
    expect(readSupportReturn("https://imperatle.com/pt?support=thanks")).toEqual({ clean: "https://imperatle.com/pt", thanks: true });
    expect(readSupportReturn("https://imperatle.com/pt")).toBeNull();
  });
});

describe("price in the dialog", () => {
  const price: SupportPrice = { available: true, defaultCurrency: "usd", amounts: { usd: 499, brl: 990, eur: 499 } };

  it("guesses the currency from the time zone, falling back to the default", () => {
    expect(guessCurrency(price, "America/Sao_Paulo")).toBe("brl");
    expect(guessCurrency(price, "Europe/Lisbon")).toBe("eur");
    expect(guessCurrency(price, "Europe/London")).toBe("usd");
    expect(guessCurrency(price, "America/New_York")).toBe("usd");
    expect(guessCurrency(price, undefined)).toBe("usd");
  });

  it("uses the default when the local currency isn't sold", () => {
    expect(guessCurrency({ ...price, amounts: { usd: 499 } }, "America/Sao_Paulo")).toBe("usd");
  });

  it("formats in the page's language", () => {
    expect(formatPrice(price, "brl", "pt")).toMatch(/^R\$\s9,90$/);
    expect(formatPrice(price, "usd", "en")).toBe("$4.99");
  });

  it("is null without amounts", () => {
    const empty: SupportPrice = { available: true, defaultCurrency: null, amounts: null };
    expect(guessCurrency(empty, "America/Sao_Paulo")).toBeNull();
    expect(formatPrice(empty, null, "en")).toBeNull();
  });
});

describe("startCheckout", () => {
  afterEach(() => vi.unstubAllGlobals());

  const answer = (status: number, body: unknown = {}) =>
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));

  it("goes to Stripe's checkout page", async () => {
    answer(200, { url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    expect(await startCheckout("pt")).toEqual({ kind: "redirect", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  });

  it("never follows a url that isn't Stripe's", async () => {
    answer(200, { url: "https://evil.example/pay" });
    expect(await startCheckout("en")).toEqual({ kind: "error" });
  });

  it("maps the API's refusals", async () => {
    answer(409);
    expect(await startCheckout("en")).toEqual({ kind: "supporter" });
    answer(401);
    expect(await startCheckout("en")).toEqual({ kind: "login" });
    answer(502);
    expect(await startCheckout("en")).toEqual({ kind: "error" });
  });

  it("reports a network failure as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await startCheckout("en")).toEqual({ kind: "error" });
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
