"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { SUPPORT_EVENT, openSupport } from "@/lib/dialogs";
import { googleLoginUrl, refreshMe, useMe } from "@/lib/me";
import { fetchSupportPrice, formatPrice, guessCurrency, startCheckout } from "@/lib/supportCheckout";
import { readSupportReturn, supportReturnUrl, supportView, waitForSupporter } from "@/lib/supportFlow";
import { AppDialog } from "./AppDialog";

const PERKS = ["archive", "practice", "noAds", "solo"] as const;

// idle: the normal view; opening: asking the API for the Stripe checkout;
// thanks: back from a payment, /me is asked until the webhook lands.
type Purchase = "idle" | "opening" | "error" | "thanks";

// The Supporter (lifetime) purchase: perks, the price in the visitor's
// currency, and the button to Stripe's hosted checkout. Buying needs an
// account, because the API ties the Stripe session to the user id.
export function SupportDialog() {
  const t = useTranslations("Support");
  const locale = useLocale();
  const me = useMe();
  const [purchase, setPurchase] = useState<Purchase>("idle");
  const [confirmed, setConfirmed] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const priceRequested = useRef(false);
  // Set when the page loads back from Stripe, so the dialog opens on the thanks.
  const backFromPayment = useRef(false);

  const view = supportView(me, available);

  // Back from the Google login (?support=1) or from Stripe (?support=thanks):
  // reopen this dialog, on the thank-you after a payment.
  useEffect(() => {
    const back = readSupportReturn(window.location.href);
    if (back === null) return;
    window.history.replaceState(window.history.state, "", back.clean);
    backFromPayment.current = back.thanks;
    openSupport();
  }, []);

  // The browser's Back button from Stripe can restore this page from its
  // cache, still on "opening": let the button work again.
  useEffect(() => {
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) setPurchase((p) => (p === "opening" ? "idle" : p));
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  async function loadPrice() {
    if (priceRequested.current) return;
    priceRequested.current = true;
    const result = await fetchSupportPrice();
    setAvailable(result.available);
    setPrice(formatPrice(result, guessCurrency(result, Intl.DateTimeFormat().resolvedOptions().timeZone), locale));
    // An API hiccup shouldn't hide the purchase for the rest of the visit.
    if (!result.available) priceRequested.current = false;
  }

  function handleOpen() {
    if (backFromPayment.current) {
      backFromPayment.current = false;
      setPurchase("thanks");
      void waitForSupporter(refreshMe).then(setConfirmed);
    } else {
      setPurchase("idle");
      void refreshMe();
    }
    void loadPrice();
  }

  async function buy() {
    // Only the "buy" view has this button; the API checks again that this
    // account isn't a supporter before creating any checkout.
    if (view !== "buy" || purchase === "opening") return;
    setPurchase("opening");
    const start = await startCheckout(locale);
    if (start.kind === "redirect") {
      // Stays on "opening" while the browser leaves for Stripe.
      window.location.assign(start.url);
      return;
    }
    if (start.kind === "error") {
      setPurchase("error");
      return;
    }
    // Already a supporter, or signed out meanwhile: /me updates the view.
    setPurchase("idle");
    void refreshMe();
  }

  function login() {
    window.location.assign(googleLoginUrl(supportReturnUrl(window.location.href)));
  }

  const primaryButton =
    "rounded-full bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85 disabled:opacity-60";

  return (
    <AppDialog event={SUPPORT_EVENT} title={t("title")} onOpen={handleOpen} selectable>
      {purchase === "thanks" ? (
        <>
          <p className="font-display text-lg text-highlight">{t("thanks.title")}</p>
          <p>{t(confirmed || view === "supporter" ? "thanks.confirmed" : "thanks.pending")}</p>
          <p className="text-muted">{t("thanks.receipt")}</p>
        </>
      ) : (
        <>
          <p>{t("intro")}</p>
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-base text-muted">{t("perksTitle")}</p>
            <ul className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5">
              {PERKS.map((perk) => (
                <li key={perk} className="flex gap-2">
                  <span aria-hidden className="text-highlight">
                    ◆
                  </span>
                  <span>
                    <strong className="font-semibold">{t(`perks.${perk}.title`)}:</strong> {t(`perks.${perk}.text`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {view === "supporter" && (
            <p className="rounded-xl border border-highlight/60 px-3 py-2.5 text-center font-display text-highlight">
              {t("alreadySupporter")}
            </p>
          )}

          {view === "unavailable" && <p className="text-muted">{t("unavailable")}</p>}

          {(view === "buy" || view === "login") && (
            <div className="flex flex-col items-center gap-2 text-center">
              {price !== null ? (
                <p>
                  <span className="font-display text-2xl">{price}</span> <span className="text-muted">{t("oneTime")}</span>
                </p>
              ) : (
                <p className="text-muted">{t("oneTimeNoPrice")}</p>
              )}
              {view === "buy" ? (
                <button type="button" onClick={buy} disabled={purchase === "opening"} className={primaryButton}>
                  {purchase === "opening" ? t("opening") : t("buy")}
                </button>
              ) : (
                <>
                  <button type="button" onClick={login} className={primaryButton}>
                    {t("login")}
                  </button>
                  <p className="text-xs text-muted">{t("loginNote")}</p>
                </>
              )}
              {purchase === "error" && <p className="text-xs text-highlight">{t("checkoutError")}</p>}
            </div>
          )}

          {view === "loading" && <p className="text-center text-muted">…</p>}

          <p className="text-xs text-muted">
            {t("merchant")}{" "}
            <Link
              href="/refunds"
              onClick={(e) => e.currentTarget.closest("dialog")?.close()}
              className="underline underline-offset-2 hover:text-foreground">
              {t("refundLink")}
            </Link>
          </p>
        </>
      )}
      <form method="dialog" className="self-center">
        <button className="rounded-full border border-line px-6 py-1.5 text-sm font-semibold hover:bg-surface">
          {t("close")}
        </button>
      </form>
    </AppDialog>
  );
}
