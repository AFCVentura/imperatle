"use client";

import { useLocale, useTranslations } from "next-intl";
import type { GuessHistoryEntry } from "@/lib/gameStorage";
import { pickLocalized } from "@/lib/pickLocalized";
import type { ComparisonResult } from "@/lib/types";

interface GuessCardsProps {
  guesses: GuessHistoryEntry[];
  attemptsAllowed: number;
}

const COMPARISON_ARROW: Record<ComparisonResult, string> = {
  Bigger: "▲",
  Smaller: "▼",
  Approximate: "≈",
};

// All slots render from the start (locked/empty), not just as guesses come
// in -- same "whole board visible upfront" idea as the hint rows.
export function GuessCards({ guesses, attemptsAllowed }: GuessCardsProps) {
  const t = useTranslations("Game");
  const locale = useLocale();

  const slots = Array.from({ length: attemptsAllowed }, (_, i) => guesses[i] ?? null);

  return (
    <div className="flex w-full max-w-xl flex-col gap-1.5">
      {slots.map((guess, i) => (
        <div
          key={i}
          className={`flex h-10 items-stretch overflow-hidden rounded-full border text-xs ${
            guess
              ? guess.correct
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-foreground/15 bg-foreground/[0.04]"
              : "border-dashed border-foreground/10"
          }`}
        >
          <span className="flex w-7 shrink-0 items-center justify-center text-foreground/35">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate self-center px-1 font-medium">
            {guess ? pickLocalized(guess.nameEn, guess.namePt, locale) : t("emptyGuessSlot")}
          </span>
          {guess?.correct && (
            <span className="shrink-0 self-center px-3 text-emerald-600 dark:text-emerald-400">
              {t("correctGuessMark")}
            </span>
          )}
          {guess && !guess.correct && guess.areaComparison && guess.durationComparison && (
            <>
              <span className="w-px shrink-0 bg-foreground/10" />
              <span className="flex w-[5.5rem] shrink-0 items-center justify-center gap-1 self-center px-1 text-foreground/70">
                <span aria-hidden>{COMPARISON_ARROW[guess.areaComparison]}</span>
                {t("guessColumns.area")}
              </span>
              <span className="w-px shrink-0 bg-foreground/10" />
              <span className="flex w-[5.5rem] shrink-0 items-center justify-center gap-1 self-center px-1 text-foreground/70">
                <span aria-hidden>{COMPARISON_ARROW[guess.durationComparison]}</span>
                {t("guessColumns.duration")}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
