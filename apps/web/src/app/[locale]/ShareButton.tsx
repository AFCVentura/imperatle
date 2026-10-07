"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { GuessHistoryEntry } from "@/lib/gameStorage";
import { buildShareText, shareResult } from "@/lib/share";

interface ShareButtonProps {
  guesses: GuessHistoryEntry[];
  challengeNumber: number;
  attemptsAllowed: number;
}

export function ShareButton({ guesses, challengeNumber, attemptsAllowed }: ShareButtonProps) {
  const t = useTranslations("Stats");
  const [feedback, setFeedback] = useState<"copied" | "failed" | null>(null);

  async function handleShare() {
    const outcome = await shareResult(buildShareText(guesses, challengeNumber, attemptsAllowed));
    if (outcome === "shared") return;
    setFeedback(outcome);
    window.setTimeout(() => setFeedback(null), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      <span aria-live="polite">{feedback === "copied" ? t("copied") : feedback === "failed" ? t("shareFailed") : t("share")}</span>
    </button>
  );
}
