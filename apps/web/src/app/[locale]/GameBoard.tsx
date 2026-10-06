"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { submitGuess } from "@/lib/api";
import { loadGameProgress, saveGameProgress, type GuessHistoryEntry } from "@/lib/gameStorage";
import { pickLocalized } from "@/lib/pickLocalized";
import { comparisonFromApi, EMPTY_REVEAL, type ChallengeReveal, type EmpireAnswer, type EmpireSummary, type TodayChallenge } from "@/lib/types";
import { EmpireAutocomplete } from "./EmpireAutocomplete";
import { AttemptList } from "./AttemptList";
import { HintRow } from "./HintRow";
import { useHintRows } from "./useHintRows";

interface GameBoardProps {
  challenge: TodayChallenge;
  empires: EmpireSummary[];
}

export function GameBoard({ challenge, empires }: GameBoardProps) {
  const t = useTranslations("Game");
  const locale = useLocale();

  const [guesses, setGuesses] = useState<GuessHistoryEntry[]>([]);
  const [reveal, setReveal] = useState<ChallengeReveal | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [answer, setAnswer] = useState<EmpireAnswer | null>(null);
  const [selectedEmpireId, setSelectedEmpireId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore today's progress from localStorage only after mount -- reading it
  // during the initial render would desync the server-rendered HTML from what
  // the browser would render, which React flags as a hydration mismatch.
  useEffect(() => {
    const saved = loadGameProgress(challenge.date);
    if (saved) {
      setGuesses(saved.guesses);
      setReveal(saved.reveal);
      setGameOver(saved.gameOver);
      setAnswer(saved.answer);
    }
    setHydrated(true);
  }, [challenge.date]);

  useEffect(() => {
    if (!hydrated) return;
    saveGameProgress({ date: challenge.date, guesses, reveal, gameOver, answer });
  }, [hydrated, challenge.date, guesses, reveal, gameOver, answer]);

  async function handleGuess() {
    if (selectedEmpireId === null || gameOver || submitting) return;
    const empire = empires.find((e) => e.id === selectedEmpireId);
    if (!empire) return;

    setSubmitting(true);
    setError(false);
    try {
      const result = await submitGuess(selectedEmpireId);

      setGuesses((prev) => [
        ...prev,
        {
          empireId: empire.id,
          nameEn: empire.nameEn,
          namePt: empire.namePt,
          correct: result.correct,
          areaComparison: result.comparison ? comparisonFromApi(result.comparison.area) : null,
          durationComparison: result.comparison ? comparisonFromApi(result.comparison.duration) : null,
        },
      ]);
      if (result.reveal) setReveal(result.reveal);
      if (result.gameOver) {
        setGameOver(true);
        setAnswer(result.answer);
      }
      setSelectedEmpireId(null);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  // Hooks must run before the early return below.
  const hintRows = useHintRows(gameOver && answer ? answer : (reveal ?? EMPTY_REVEAL));

  if (!hydrated) return null;

  const lastGuess = guesses[guesses.length - 1];
  // Rows not shown under a wrong guess -- after a correct guess, the clues
  // the player never needed are shown with the answer.
  const wrongGuessCount = guesses.filter((g) => !g.correct).length;
  const remainingHintRows = hintRows.slice(wrongGuessCount);

  return (
    // Phone-sized column on every screen, so the PC looks like the mobile layout.
    <div className="flex w-full max-w-md flex-col gap-6 md:gap-3">
      {challenge.mapUrl ? (
        <div className="flex justify-center rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800">
          <Image
            src={challenge.mapUrl}
            alt={t("mapAlt")}
            width={553}
            height={553}
            unoptimized
            priority
            // Square, capped at 240px and at 30% of the screen height, so the
            // map never takes over short screens.
            className="aspect-square h-auto w-full max-w-[min(15rem,30dvh)]"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700">
          {t("mapComingSoon")}
        </div>
      )}

      {!gameOver && (
        // Phone: pinned to the bottom of the screen (and moved after the
        // hints) so a guess never needs scrolling back up. From md up it sits
        // under the map as before.
        <div className="sticky bottom-0 z-10 order-last -mx-4 flex gap-2 border-t border-foreground/10 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:order-none md:border-0 md:p-0">
          <EmpireAutocomplete
            clearKey={guesses.length}
            empires={empires}
            busy={submitting}
            onSelect={setSelectedEmpireId}
            onSubmit={handleGuess}
          />
          <button
            onClick={handleGuess}
            // Keep focus (and the phone keyboard) on the input for the next guess.
            onMouseDown={(e) => e.preventDefault()}
            disabled={selectedEmpireId === null || submitting}
            className="rounded-full bg-foreground px-5 py-2 text-sm md:py-1.5 font-medium text-background disabled:opacity-40"
          >
            {t("guessButton")}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{t("submitError")}</p>}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("guessHistoryTitle")}</h2>
          <p className="text-sm text-zinc-500">
            {t("attempts", { used: guesses.length, total: challenge.attemptsAllowed })}
          </p>
        </div>
        <AttemptList
          guesses={guesses}
          attemptsAllowed={challenge.attemptsAllowed}
          hintRows={hintRows}
          gameOver={gameOver}
        />
      </div>

      {gameOver && answer && (
        <div className="rounded-2xl border border-foreground/15 bg-foreground/[0.04] px-4 py-3">
          <h2 className="text-lg font-semibold">{lastGuess?.correct ? t("correctTitle") : t("gameOverTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("answerWasLabel")}: <strong>{pickLocalized(answer.nameEn, answer.namePt, locale)}</strong>
          </p>
          <p className="mt-1 text-sm text-zinc-500">{t("playAgainTomorrow")}</p>
        </div>
      )}

      {gameOver && answer && remainingHintRows.length > 0 && (
        // Same look as an attempt's clue section: one pill, rows and cells
        // split by dividers.
        <div>
          <h2 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t("remainingHintsLabel")}
          </h2>
          <div className="divide-y divide-foreground/10 rounded-2xl border border-foreground/15 bg-foreground/[0.04]">
            {remainingHintRows.map((row) => (
              <HintRow key={row.attempt} row={row} variant="cell" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
