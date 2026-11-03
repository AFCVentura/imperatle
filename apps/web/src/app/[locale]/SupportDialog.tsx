"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "@/i18n/navigation";
import { SUPPORT_EVENT, openSupport } from "@/lib/dialogs";
import { googleLoginUrl, refreshMe, useMe } from "@/lib/me";
import { PADDLE_CONFIG, formattedSupporterPrice, getPaddle, onPaddleEvent } from "@/lib/paddle";
import { supportReturnUrl, supportView, waitForSupporter, withoutSupportReturn } from "@/lib/supportFlow";
import { AppDialog } from "./AppDialog";

const PERKS = ["archive", "practice", "noAds", "solo"] as const;

// idle: the normal view; opening: loading Paddle.js; thanks: Paddle reported
// the payment and /me is being asked until the webhook lands.
type Purchase = "idle" | "opening" | "error" | "thanks";

// The Supporter (lifetime) purchase: perks, the price as Paddle shows it in
// the visitor's country, and the overlay checkout. Buying needs an account,
// because the purchase is tied to the user id sent to Paddle as customData.
export function SupportDialog() {
  const t = useTranslations("Support");
  const locale = useLocale();
  const me = useMe();
  const [purchase, setPurchase] = useState<Purchase>("idle");
  const [confirmed, setConfirmed] = useState(false);
  const [price, setPrice] = useState<string | null>(null);
  const [priceFailed, setPriceFailed] = useState(false);
  const priceRequested = useRef(false);
  const completed = useRef(false);
  // Set when the dialog reopens right after a payment, to show the thanks once.
  const showThanks = useRef(false);

  const view = supportView(me, PADDLE_CONFIG !== null);

  // Back from the Google login with ?support=1: reopen this dialog.
  useEffect(() => {
    const clean = withoutSupportReturn(window.location.href);
    if (clean === null) return;
    window.history.replaceState(window.history.state, "", clean);
    openSupport();
  }, []);

  // Paddle's checkout runs above the page: when it reports the payment, close
  // it and come back here with the thank-you state.
  useEffect(
    () =>
      onPaddleEvent((event) => {
        if (event.name !== "checkout.completed" || completed.current) return;
        completed.current = true;
        setPurchase("thanks");
        showThanks.current = true;
        window.Paddle?.Checkout.close();
        openSupport();
        void waitForSupporter(refreshMe).then(setConfirmed);
      }),
    [],
  );

  async function loadPrice() {
    if (!PADDLE_CONFIG || priceRequested.current) return;
    priceRequested.current = true;
    const paddle = await getPaddle(PADDLE_CONFIG);
    try {
      // No address: Paddle finds the visitor's country from the IP, so the
      // per-country price and local currency show up.
      const preview = await paddle?.PricePreview({ items: [{ priceId: PADDLE_CONFIG.priceId, quantity: 1 }] });
      const formatted = formattedSupporterPrice(preview);
      setPrice(formatted);
      setPriceFailed(formatted === null);
    } catch {
      // Shown without the amount; Paddle's checkout still shows it before paying.
      setPriceFailed(true);
      priceRequested.current = false;
    }
  }

  function handleOpen() {
    if (showThanks.current) showThanks.current = false;
    else setPurchase("idle");
    void refreshMe();
    void loadPrice();
  }

  async function buy(e: MouseEvent<HTMLButtonElement>) {
    const user = me?.user;
    // Only the "buy" view has this button, but a supporter must never reach
    // the checkout through any path (a stale /me, a double click): the
    // account is checked again right before Paddle opens.
    if (!PADDLE_CONFIG || !user || view !== "buy" || purchase === "opening") return;
    const dialog = e.currentTarget.closest("dialog");
    setPurchase("opening");
    const fresh = await refreshMe();
    if (supportView(fresh, true) !== "buy" || fresh.user?.id !== user.id) {
      setPurchase("idle");
      return;
    }
    const paddle = await getPaddle(PADDLE_CONFIG);
    if (!paddle) {
      setPurchase("error");
      return;
    }
    completed.current = false;
    // A modal <dialog> sits above everything, Paddle's overlay included.
    dialog?.close();
    setPurchase("idle");
    paddle.Checkout.open({
      items: [{ priceId: PADDLE_CONFIG.priceId, quantity: 1 }],
      customData: { userId: user.id },
      customer: user.email ? { email: user.email } : undefined,
      settings: {
        displayMode: "overlay",
        locale: locale === "pt" ? "pt" : "en",
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      },
    });
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
              {price !== null || !priceFailed ? (
                <p>
                  <span className="font-display text-2xl">{price ?? "…"}</span>{" "}
                  <span className="text-muted">{t("oneTime")}</span>
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
