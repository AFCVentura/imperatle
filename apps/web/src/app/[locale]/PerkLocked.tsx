"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { openSupport } from "@/lib/dialogs";

// What a non-supporter sees on a perk page: what the perk is, and the way to
// the support dialog. The API is what refuses (403); this only explains it.
export function PerkLocked({ perk }: { perk: "archive" | "practice" }) {
  const t = useTranslations("Perks");

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-6 text-center">
      <svg viewBox="0 0 24 24" className="size-8 text-highlight" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <h2 className="font-display text-lg">{t("lockedTitle")}</h2>
      <p className="text-sm leading-relaxed">{t(perk === "archive" ? "lockedArchive" : "lockedPractice")}</p>
      <button
        type="button"
        onClick={openSupport}
        className="rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85"
      >
        {t("becomeSupporter")}
      </button>
      <Link href="/" className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline">
        {t("backToGame")}
      </Link>
    </div>
  );
}

// What a supporter sees on the practice page before today's daily game is
// over. Also decided by the API (409 "daily_not_finished"): practice can draw
// any empire, today's included.
export function PracticeNeedsDaily() {
  const t = useTranslations("Practice");

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-6 text-center">
      <svg viewBox="0 0 24 24" className="size-8 text-highlight" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5" />
      </svg>
      <h2 className="font-display text-lg">{t("dailyFirstTitle")}</h2>
      <p className="text-sm leading-relaxed">{t("dailyFirstText")}</p>
      <Link
        href="/"
        className="rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85"
      >
        {t("dailyFirstButton")}
      </Link>
    </div>
  );
}

export function PerkMessage({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}
