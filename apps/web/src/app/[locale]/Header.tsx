"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { resetTodayChallenge } from "@/lib/api";
import { clearAllGameProgress } from "@/lib/gameStorage";

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
    t("menu.createAccount"),
    t("menu.statistics"),
    t("menu.howToPlay"),
    t("menu.support"),
    t("menu.feedback"),
    t("menu.about"),
  ];

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-center border-b border-foreground/10 bg-background px-4">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-wide">Imperatle</span>
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            onClick={handleDebugReset}
            disabled={resetting}
            title="Debug: reset today's attempts"
            className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400"
          >
            {resetting ? "…" : "DEV reset"}
          </button>
        )}
      </div>

      <button
        type="button"
        aria-label={t("menuLabel")}
        onClick={() => setOpen(true)}
        className="absolute right-4 flex h-9 w-9 items-center justify-center rounded-md hover:bg-foreground/10"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <nav className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 bg-background p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-lg font-semibold">Imperatle</span>
              <button
                type="button"
                aria-label={t("closeLabel")}
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-foreground/10"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {menuItems.map((label) => (
              <button
                key={label}
                type="button"
                className="rounded-md px-3 py-2 text-left text-sm hover:bg-foreground/10"
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
