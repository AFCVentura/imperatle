"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { submitGuess } from "@/lib/api";
import { openStats } from "@/lib/dialogs";
import { loadGameProgress, saveGameProgress, type GuessHistoryEntry } from "@/lib/gameStorage";
import { pickLocalized } from "@/lib/pickLocalized";
import { comparisonFromApi, EMPTY_REVEAL, type ChallengeReveal, type EmpireAnswer, type EmpireSummary, type TodayChallenge } from "@/lib/types";
import { EmpireAutocomplete } from "./EmpireAutocomplete";
import { AttemptList } from "./AttemptList";
import { HintRow } from "./HintRow";
import { ShareButton } from "./ShareButton";
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
        // Give the final guess a moment on screen before the stats cover it.
        window.setTimeout(openStats, 1500);
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
        // Discourages saving/copying the map: no right-click menu, no
        // dragging, no long-press "save image" on iOS, no selection. It's a
        // deterrent only -- the file is still reachable from dev tools.
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="flex select-none justify-center rounded-xl border border-map-line bg-map p-3 [-webkit-touch-callout:none]"
        >
          <Image
            draggable={false}
            src={challenge.mapUrl}
            alt={t("mapAlt")}
            width={553}
            height={553}
            unoptimized
            priority
            // Square, capped at 240px and at 30% of the screen height, so the
            // map never takes over short screens.
            className="pointer-events-none aspect-square h-auto w-full max-w-[min(15rem,30dvh)]"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-line text-sm text-muted">
          {t("mapComingSoon")}
        </div>
      )}

      {!gameOver && (
        // Phone: pinned to the bottom of the screen (and moved after the
        // hints) so a guess never needs scrolling back up. From md up it sits
        // under the map as before.
        <div className="sticky bottom-0 z-10 order-last -mx-4 flex gap-2 border-t border-line bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:order-none md:mx-0 md:border-0 md:p-0">
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
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85 disabled:opacity-40 disabled:hover:bg-accent md:py-1.5"
          >
            {t("guessButton")}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger">{t("submitError")}</p>}

      <div>
        <div className="mb-1.5 flex select-none items-baseline justify-between gap-3">
          <h2 className="font-display text-base tracking-wide text-muted">{t("guessHistoryTitle")}</h2>
          <p className="font-display text-sm text-muted">
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
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <h2 className="font-display text-xl">{lastGuess?.correct ? t("correctTitle") : t("gameOverTitle")}</h2>
          <p className="mt-1 text-sm">
            {t("answerWasLabel")}: <strong>{pickLocalized(answer.nameEn, answer.namePt, locale)}</strong>
          </p>
          <p className="mt-1 text-sm text-muted">{t("playAgainTomorrow")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ShareButton
              guesses={guesses}
              challengeNumber={challenge.challengeNumber}
              attemptsAllowed={challenge.attemptsAllowed}
            />
            <button
              type="button"
              onClick={openStats}
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background"
            >
              {t("viewStats")}
            </button>
          </div>
        </div>
      )}

      {gameOver && answer && remainingHintRows.length > 0 && (
        // Same look as an attempt's clue section: one pill, rows and cells
        // split by dividers.
        <div className="select-none">
          <h2 className="mb-1.5 font-display text-base tracking-wide text-muted">
            {t("remainingHintsLabel")}
          </h2>
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {remainingHintRows.map((row) => (
              <HintRow key={row.attempt} row={row} variant="cell" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
