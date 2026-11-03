"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ACCOUNT_EVENT } from "@/lib/dialogs";
import { deleteAccount, googleLoginUrl, logout, useMe } from "@/lib/me";
import { AppDialog } from "./AppDialog";

const PERKS = ["sync", "safe", "merge"] as const;

const LOGIN_ERROR_PARAM = "login";
const LOGIN_ERROR_DETAIL = "loginError";

// The page without the API's ?login=error flag, to come back to after login.
function currentPageUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(LOGIN_ERROR_PARAM);
  return url.toString();
}

// Optional account. Signed out: what an account gives and "Sign in with
// Google" (the API runs the login and sends the browser back here). Signed
// in: who you are, sign out, and delete the account after a confirmation.
export function AccountDialog() {
  const t = useTranslations("Account");
  const me = useMe();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"login" | "action" | null>(null);

  // The API comes back with ?login=error when Google login didn't finish:
  // open this dialog with a message and clean the address bar.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(LOGIN_ERROR_PARAM) !== "error") return;
    window.history.replaceState(null, "", currentPageUrl());
    window.dispatchEvent(new CustomEvent(ACCOUNT_EVENT, { detail: LOGIN_ERROR_DETAIL }));
  }, []);

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    setError(null);
    const ok = await action();
    setBusy(false);
    if (!ok) {
      setError("action");
      return;
    }
    // A clean page for the signed-out browser (fresh anonymous id).
    window.location.reload();
  }

  const user = me?.authenticated ? me.user : null;
  const buttonClass =
    "rounded-full px-5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50";

  return (
    <AppDialog
      event={ACCOUNT_EVENT}
      title={user ? t("title") : t("signInTitle")}
      onOpen={(e) => {
        setConfirming(false);
        setError(e instanceof CustomEvent && e.detail === LOGIN_ERROR_DETAIL ? "login" : null);
      }}
      selectable
    >
      {error && (
        <p role="alert" className="rounded-xl border border-highlight/60 px-3 py-2 text-highlight">
          {error === "login" ? t("loginError") : t("error")}
        </p>
      )}

      {me === null && <p className="text-muted">{t("loading")}</p>}

      {me !== null && !user && (
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
          <button
            type="button"
            onClick={() => window.location.assign(googleLoginUrl(currentPageUrl()))}
            className="flex items-center justify-center gap-2.5 self-center rounded-full border border-line bg-white px-5 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition-colors hover:bg-neutral-100"
          >
            <GoogleLogo />
            {t("google")}
          </button>
          <p className="text-center text-xs text-muted">{t("privacy")}</p>
        </>
      )}

      {user && !confirming && (
        <>
          <div className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="text-xs text-muted">{t("signedInAs")}</span>
            <span className="flex items-center gap-2 font-semibold">
              {user.displayName}
              {user.isSupporter && (
                <span className="rounded-full border border-highlight/60 px-2 py-0.5 font-display text-xs tracking-wide text-highlight">
                  {t("supporter")}
                </span>
              )}
            </span>
            <span className="break-all text-muted">{user.email}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="rounded-md px-2 py-1 text-sm text-muted underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
            >
              {t("delete")}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => run(() => logout({ allDevices: true }))}
                disabled={busy}
                className={`${buttonClass} border border-line hover:bg-surface`}
              >
                {t("signOutAll")}
              </button>
              <button
                type="button"
                onClick={() => run(() => logout())}
                disabled={busy}
                className={`${buttonClass} bg-accent text-accent-foreground hover:bg-accent/85`}
              >
                {t("signOut")}
              </button>
            </div>
          </div>
        </>
      )}

      {user && confirming && (
        <>
          <p className="font-display text-base">{t("confirmTitle")}</p>
          <p>{t("confirmText")}</p>
          {user.isSupporter && <p className="font-semibold">{t("confirmSupporter")}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className={`${buttonClass} border border-line hover:bg-surface`}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => run(deleteAccount)}
              disabled={busy}
              className={`${buttonClass} bg-[#9B111E] text-white hover:bg-[#7d0e18]`}
            >
              {t("confirmDelete")}
            </button>
          </div>
        </>
      )}
    </AppDialog>
  );
}

// Google's "G" mark, as its sign-in button guidelines ask.
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
