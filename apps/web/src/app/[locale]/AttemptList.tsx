"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTooltip } from "./useTooltip";
import type { GuessHistoryEntry } from "@/lib/gameStorage";
import { pickLocalized } from "@/lib/pickLocalized";
import type { ComparisonResult } from "@/lib/types";
import { HintRow } from "./HintRow";
import { MarqueeText } from "./MarqueeText";
import { hintRowNames, type HintRowData } from "./useHintRows";

interface AttemptListProps {
  guesses: GuessHistoryEntry[];
  attemptsAllowed: number;
  hintRows: HintRowData[];
  gameOver: boolean;
}

const COMPARISON_ARROW: Record<ComparisonResult, string> = {
  Bigger: "▲",
  Smaller: "▼",
  Approximate: "≈",
};

// One entry per attempt, newest on top, each a pill holding the guess and
// the clues about the map's empire that this wrong guess unlocked. Unused slots come last, each saying which
// clues it would unlock, so the whole board is still visible upfront.
export function AttemptList({ guesses, attemptsAllowed, hintRows, gameOver }: AttemptListProps) {
  const t = useTranslations("Game");
  const locale = useLocale();

  // The last attempt unlocks no new clues (there are fewer clue rows than
  // attempts), so its slot just says it's the last one.
  const emptySlots = gameOver
    ? []
    : Array.from({ length: Math.max(0, attemptsAllowed - guesses.length) }, (_, i) => {
        const number = guesses.length + i + 1;
        return { number, row: hintRows[number - 1] ?? null };
      });

  return (
    <div className="flex w-full select-none flex-col gap-2">
      {guesses
        .map((guess, i) => ({ guess, number: i + 1 }))
        .reverse()
        .map(({ guess, number }) => {
          const hintRow = guess.correct ? null : hintRows[number - 1];
          return (
            // One pill per attempt: the guess on top, and -- below a divider,
            // since they're about the map's empire, not the guessed one --
            // the clues this wrong guess unlocked.
            <div
              key={number}
              className={`border text-xs ${hintRow ? "rounded-2xl" : "rounded-full"} ${
                guess.correct ? "border-success/50 bg-success/15" : "border-line bg-surface"
              }`}
            >
              <div className="flex h-8 items-stretch">
                <span className="flex w-7 shrink-0 items-center justify-center text-muted/70">{number}</span>
                {!guess.correct && (
                  <span
                    role="img"
                    aria-label={t("wrongGuessMark")}
                    className="flex shrink-0 items-center pr-1.5 text-sm font-bold text-danger"
                  >
                    ✕
                  </span>
                )}
                <span className="min-w-0 flex-1 self-center px-1">
                  <MarqueeText className="font-medium text-muted">{pickLocalized(guess.nameEn, guess.namePt, locale)}</MarqueeText>
                </span>
                {guess.correct && (
                  <span className="shrink-0 self-center px-3 font-semibold text-success">
                    {t("correctGuessMark")}
                  </span>
                )}
                {!guess.correct && guess.areaComparison && guess.durationComparison && (
                  <>
                    <span className="w-px shrink-0 bg-line" />
                    <ComparisonBadge kind="area" result={guess.areaComparison} />
                    <span className="w-px shrink-0 bg-line" />
                    <ComparisonBadge kind="duration" result={guess.durationComparison} />
                  </>
                )}
              </div>

              {hintRow && (
                <div className="border-t border-line">
                  <HintRow row={hintRow} variant="cell" />
                </div>
              )}
            </div>
          );
        })}

      {emptySlots.length > 0 && (
        <div className="flex flex-col gap-1">
          {emptySlots.map(({ number, row }) => (
            <div
              key={number}
              className="flex h-7 items-center overflow-hidden rounded-full border border-dashed border-line text-xs"
            >
              <span className="flex w-7 shrink-0 items-center justify-center text-muted/60">{number}</span>
              <span className="min-w-0 flex-1 px-1">
                <MarqueeText className="text-muted/70">
                  {row ? t("unlocksLabel", { fields: hintRowNames(row, locale) }) : t("lastAttempt")}
                </MarqueeText>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// "▲ Area" / "▼ Duration" block of a wrong guess, with a tooltip saying what
// the arrow means for this guess (hover after a short delay, or click/tap).
function ComparisonBadge({ kind, result }: { kind: "area" | "duration"; result: ComparisonResult }) {
  const t = useTranslations("Game");
  const { anchorProps, toggle, tooltip } = useTooltip(
    <>
      <span className="mb-0.5 block font-display font-semibold">{t(`guessColumns.${kind}`)}</span>
      {t(`comparisonInfo.${kind}.${result}`)}
    </>,
  );

  return (
    <span
      {...anchorProps}
      role="button"
      tabIndex={0}
      onPointerUp={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className="flex w-[5.5rem] shrink-0 cursor-default items-center justify-center gap-1 px-1 font-medium text-foreground"
    >
      <span aria-hidden>{COMPARISON_ARROW[result]}</span>
      {t(`guessColumns.${kind}`)}
      {tooltip}
    </span>
  );
}
