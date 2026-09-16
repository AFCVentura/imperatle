"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { submitGuess } from "@/lib/api";
import { loadGameProgress, saveGameProgress, type GuessHistoryEntry } from "@/lib/gameStorage";
import { pickLocalized } from "@/lib/pickLocalized";
import type { ChallengeReveal, EmpireAnswer, EmpireSummary, TodayChallenge } from "@/lib/types";
import { EmpireAutocomplete } from "./EmpireAutocomplete";
import { HintsPanel } from "./HintsPanel";

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
        { empireId: empire.id, nameEn: empire.nameEn, namePt: empire.namePt, correct: result.correct },
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

  if (!hydrated) return null;

  const lastGuess = guesses[guesses.length - 1];

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <p className="text-center text-sm text-zinc-500">
        {t("attempts", { used: guesses.length, total: challenge.attemptsAllowed })}
      </p>

      <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700">
        {t("mapComingSoon")}
      </div>

      {!gameOver && (
        <div className="flex gap-2">
          <EmpireAutocomplete key={guesses.length} empires={empires} disabled={submitting} onSelect={setSelectedEmpireId} />
          <button
            onClick={handleGuess}
            disabled={selectedEmpireId === null || submitting}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-40"
          >
            {t("guessButton")}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{t("submitError")}</p>}

      {guesses.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("guessHistoryTitle")}</h2>
          <ul className="flex flex-col gap-1">
            {guesses.map((g, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span>{g.correct ? "✅" : "❌"}</span>
                <span>{pickLocalized(g.nameEn, g.namePt, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reveal && !gameOver && <HintsPanel reveal={reveal} />}

      {gameOver && answer && (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">{lastGuess?.correct ? t("correctTitle") : t("gameOverTitle")}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("answerWasLabel")}: <strong>{pickLocalized(answer.nameEn, answer.namePt, locale)}</strong>
          </p>
          <div className="mt-3">
            <HintsPanel reveal={answer} />
          </div>
          <p className="mt-3 text-sm text-zinc-500">{t("playAgainTomorrow")}</p>
        </div>
      )}
    </div>
  );
}
