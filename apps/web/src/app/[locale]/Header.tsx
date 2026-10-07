"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { resetTodayChallenge } from "@/lib/api";
import { clearAllGameProgress } from "@/lib/gameStorage";
import { openAbout, openFeedback, openHowToPlay, openStats, openSupport } from "@/lib/dialogs";

export function Header() {
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleDebugReset() {
    if (resetting) return;
    setResetting(true);
    try {
      await resetTodayChallenge();
      clearAllGameProgress();
      window.location.reload();
    } catch {
      setResetting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const menuItems = [
    { label: t("menu.statistics"), open: openStats },
    { label: t("menu.howToPlay"), open: openHowToPlay },
    { label: t("menu.support"), open: openSupport },
    { label: t("menu.feedback"), open: openFeedback },
    { label: t("menu.about"), open: openAbout },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-center bg-header px-4 text-header-foreground shadow-sm">
      <button
        type="button"
        aria-label={t("menu.statistics")}
        title={t("menu.statistics")}
        onClick={openStats}
        className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-md hover:bg-header-foreground/10"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" d="M5 20V11M12 20V5M19 20v-6M3 20h18" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <span className="font-display text-2xl tracking-wider">Imperatle</span>
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            onClick={handleDebugReset}
            disabled={resetting}
            title="Debug: reset today's attempts"
            className="rounded-md border border-header-foreground/40 px-2 py-0.5 text-xs font-semibold text-header-foreground hover:bg-header-foreground/10 disabled:opacity-50"
          >
            {resetting ? "…" : "DEV reset"}
          </button>
        )}
      </div>

      <button
        type="button"
        aria-label={t("menuLabel")}
        onClick={() => setOpen(true)}
        className="absolute right-4 flex h-9 w-9 items-center justify-center rounded-md hover:bg-header-foreground/10"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 bg-background p-4 text-foreground shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-xl tracking-wider">Imperatle</span>
              <button
                type="button"
                aria-label={t("closeLabel")}
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-surface"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {menuItems.map(({ label, open: openDialog }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  openDialog();
                }}
                className="rounded-md px-3 py-2 text-left text-sm hover:bg-surface"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
