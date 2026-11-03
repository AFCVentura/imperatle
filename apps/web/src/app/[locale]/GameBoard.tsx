"use client";

import type { MultiPolygon } from "geojson";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { getMapShape, getTodayProgress, submitGuess } from "@/lib/api";
import { EmpireMap } from "@/map/EmpireMap";
import type { MapLocale, MapStage } from "@/map/geo";
import { mapStageForMode, type MapMode } from "@/map/stage";
import { openStats } from "@/lib/dialogs";
import { loadGameProgress, saveGameProgress, type GameProgress, type GuessHistoryEntry } from "@/lib/gameStorage";
import { pickLocalized } from "@/lib/pickLocalized";
import { reconcileProgress } from "@/lib/reconcileProgress";
import {
  comparisonFromApi,
  EMPTY_REVEAL,
  type ChallengeReveal,
  type EmpireAnswer,
  type EmpireSummary,
  type GuessResponse,
  type TodayChallenge,
} from "@/lib/types";
import { EmpireAutocomplete } from "./EmpireAutocomplete";
import { AttemptList } from "./AttemptList";
import { HintRow } from "./HintRow";
import { MapStagePicker } from "./MapStagePicker";
import { ShareButton } from "./ShareButton";
import { useHintRows } from "./useHintRows";

// One round of the game, wherever it comes from: today's challenge, a past
// day (archive) or a practice round. The board is the same; only where the
// guesses go, how progress is saved and what the end card offers change.
export interface PlaySession {
  // Identifies the round (a date, or a practice id) for saving and the map.
  key: string;
  attemptsAllowed: number;
  hasMap: boolean;
  loadShape: () => Promise<MultiPolygon>;
  submit: (empireId: number) => Promise<GuessResponse>;
  save: (progress: GameProgress) => void;
  // false = no clue rows until the round ends (practice option).
  hints?: boolean;
  mapMode?: MapMode;
  // Daily game only: the stats dialog pops up when the round ends.
  openStatsOnEnd?: boolean;
  // Line under the answer, e.g. "come back tomorrow".
  endNote?: string;
  // Buttons on the end card, before the Wikipedia link.
  endActions?: (guesses: GuessHistoryEntry[]) => ReactNode;
}

interface GameBoardProps {
  challenge: TodayChallenge;
  empires: EmpireSummary[];
}

const noSubscription = () => () => {};

// Today's progress lives in localStorage, which the server can't read: the
// board renders nothing on the server and during hydration (so the HTML
// matches), then mounts with the saved progress as its initial state.
export function GameBoard({ challenge, empires }: GameBoardProps) {
  const t = useTranslations("Game");
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  if (!hydrated) return null;

  const session: PlaySession = {
    key: challenge.date,
    attemptsAllowed: challenge.attemptsAllowed,
    hasMap: challenge.hasMap,
    loadShape: () => getMapShape(challenge.date),
    submit: submitGuess,
    save: saveGameProgress,
    openStatsOnEnd: true,
    endNote: t("playAgainTomorrow"),
    endActions: (guesses) => (
      <>
        <ShareButton guesses={guesses} challengeNumber={challenge.challengeNumber} attemptsAllowed={challenge.attemptsAllowed} />
        <button
          type="button"
          onClick={openStats}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background"
        >
          {t("viewStats")}
        </button>
      </>
    ),
  };

  return <DailyBoard session={session} empires={empires} />;
}

// The daily board starts from this browser's saved copy, then checks it
// against the server, which keeps the guesses: signed in on a second device
// (or after the browser storage was cleared) the board is rebuilt with the
// real guesses instead of starting over. Skipped once a guess has been sent
// from this board, so a late answer can't roll it back.
function DailyBoard({ session, empires }: { session: PlaySession; empires: EmpireSummary[] }) {
  const t = useTranslations("Game");
  const unknownGuess = t("unknownGuess");
  const { key: date } = session;
  const [board, setBoard] = useState(() => ({ initial: loadGameProgress(date), version: 0 }));
  const touched = useRef(false);

  useEffect(() => {
    let current = true;
    getTodayProgress().then(
      (server) => {
        if (!current || touched.current || server.date !== date) return;
        setBoard((prev) => {
          const next = reconcileProgress(date, prev.initial, server, unknownGuess);
          if (next === prev.initial) return prev;
          if (next) saveGameProgress(next);
          return { initial: next, version: prev.version + 1 };
        });
      },
      // API unreachable: the saved copy is all there is, as before.
      () => {},
    );
    return () => {
      current = false;
    };
  }, [date, unknownGuess]);

  const tracked: PlaySession = {
    ...session,
    submit: (empireId) => {
      touched.current = true;
      return session.submit(empireId);
    },
  };

  return <PlayBoard key={board.version} session={tracked} empires={empires} initial={board.initial} />;
}

// The board itself. Reads no storage: callers pass the saved progress, and
// remount it (a new `key` prop) for a new round.
export function PlayBoard({
  session,
  empires,
  initial,
}: {
  session: PlaySession;
  empires: EmpireSummary[];
  initial: GameProgress | null;
}) {
  const t = useTranslations("Game");
  const locale = useLocale();
  const hints = session.hints ?? true;
  const mapMode = session.mapMode ?? "Progressive";

  const [guesses, setGuesses] = useState<GuessHistoryEntry[]>(initial?.guesses ?? []);
  const [reveal, setReveal] = useState<ChallengeReveal | null>(initial?.reveal ?? null);
  const [gameOver, setGameOver] = useState(initial?.gameOver ?? false);
  const [answer, setAnswer] = useState<EmpireAnswer | null>(initial?.answer ?? null);
  const [selectedEmpireId, setSelectedEmpireId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [shape, setShape] = useState<MultiPolygon | "failed" | null>(null);
  const [pickedStage, setPickedStage] = useState<{ stage: MapStage; unlocked: MapStage } | null>(null);
  // Levels unlocked before this visit don't flash on a reload.
  const [stageOnArrival] = useState(() =>
    mapStageForMode(mapMode, initial?.guesses.filter((g) => !g.correct).length ?? 0, initial?.gameOver ?? false),
  );

  // The callbacks are rebuilt on every render of the caller; the round's key
  // is what decides when to load or save again.
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  });
  const { key, hasMap } = session;

  useEffect(() => {
    if (!hasMap) return;
    let current = true;
    sessionRef.current.loadShape().then(
      (s) => current && setShape(s),
      () => current && setShape("failed"),
    );
    return () => {
      current = false;
    };
  }, [key, hasMap]);

  useEffect(() => {
    sessionRef.current.save({ date: key, guesses, reveal, gameOver, answer });
  }, [key, guesses, reveal, gameOver, answer]);

  async function handleGuess() {
    if (selectedEmpireId === null || gameOver || submitting) return;
    const empire = empires.find((e) => e.id === selectedEmpireId);
    if (!empire) return;

    setSubmitting(true);
    setError(false);
    try {
      const result = await session.submit(selectedEmpireId);

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
        if (session.openStatsOnEnd) window.setTimeout(openStats, 1500);
      }
      setSelectedEmpireId(null);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  const hintRows = useHintRows(gameOver && answer ? answer : (reveal ?? EMPTY_REVEAL));
  // With clues off, no row comes with a wrong guess: they all show up
  // together under the answer once the round is over.
  const attemptHintRows = hints ? hintRows : [];

  const lastGuess = guesses[guesses.length - 1];
  // Rows not shown under a wrong guess -- after a correct guess, the clues
  // the player never needed are shown with the answer.
  const wrongGuessCount = guesses.filter((g) => !g.correct).length;
  const remainingHintRows = hints ? hintRows.slice(wrongGuessCount) : hintRows;

  const wikipediaUrl = answer ? pickLocalized(answer.wikipediaEn ?? "", answer.wikipediaPt ?? "", locale) : "";
  const summary = answer ? pickLocalized(answer.summaryEn ?? "", answer.summaryPt ?? "", locale) : "";
  // Only the curiosities that come with an explanation.
  const explainedCuriosities = (answer?.hints ?? [])
    .map((hint) => ({
      text: pickLocalized(hint.textEn, hint.textPt, locale),
      details: pickLocalized(hint.detailsEn ?? "", hint.detailsPt ?? "", locale),
    }))
    .filter((c) => c.details);

  // The map shows the most detailed level unlocked so far, unless the player
  // picked another one under it; a new unlock switches to it again.
  const unlockedStage = mapStageForMode(mapMode, wrongGuessCount, gameOver);
  const shownStage = pickedStage?.unlocked === unlockedStage ? pickedStage.stage : unlockedStage;
  const justUnlocked = unlockedStage > stageOnArrival ? unlockedStage : null;
  // An outline-only round has nothing to pick until it's over.
  const showStagePicker = mapMode !== "Outline" || gameOver;

  return (
    // Phone-sized column on every screen, so the PC looks like the mobile layout.
    <div className="flex w-full max-w-md flex-col gap-6 md:gap-3">
      {hasMap && shape !== "failed" ? (
        <>
          <div role="img" aria-label={t("mapAlt")}>
            <EmpireMap
              empire={shape}
              stage={shownStage}
              locale={locale as MapLocale}
              labels={{
                zoomIn: t("mapZoomIn"),
                zoomOut: t("mapZoomOut"),
                focus: t("mapFocus"),
                fullscreen: t("mapFullscreen"),
                exitFullscreen: t("mapExitFullscreen"),
                loading: t("mapLoading"),
                globe: t("mapGlobe"),
                flat: t("mapFlat"),
              }}
              // Same height as the old map card: capped at 30% of the screen
              // height, so the map never takes over short screens. Tablets
              // have room for a taller one.
              className="h-[calc(min(15rem,30dvh)+1.5rem)] w-full tablet:h-[calc(min(20rem,36dvh)+1.5rem)]"
            />
          </div>
          {showStagePicker && (
            <MapStagePicker
              shown={shownStage}
              unlocked={unlockedStage}
              justUnlocked={justUnlocked}
              onPick={(stage) => setPickedStage({ stage, unlocked: unlockedStage })}
            />
          )}
        </>
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
            {t("attempts", { used: guesses.length, total: session.attemptsAllowed })}
          </p>
        </div>
        <AttemptList
          guesses={guesses}
          attemptsAllowed={session.attemptsAllowed}
          hintRows={attemptHintRows}
          gameOver={gameOver}
          hintsOff={!hints}
        />
      </div>

      {gameOver && answer && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <h2 className="font-display text-xl">{lastGuess?.correct ? t("correctTitle") : t("gameOverTitle")}</h2>
          <p className="mt-1 text-sm">
            {t("answerWasLabel")}: <strong>{pickLocalized(answer.nameEn, answer.namePt, locale)}</strong>
          </p>
          {summary && (
            <div className="mt-3 border-t border-line pt-3">
              <h3 className="font-display text-sm tracking-wide text-muted">{t("aboutEmpireTitle")}</h3>
              <p className="mt-1 text-sm leading-relaxed">{summary}</p>
            </div>
          )}
          {session.endNote && <p className="mt-1 text-sm text-muted">{session.endNote}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {session.endActions?.(guesses)}
            {wikipediaUrl && (
              <a
                href={wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background"
              >
                {t("readOnWikipedia")}
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                </svg>
              </a>
            )}
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
              <HintRow key={row.attempt} row={row} />
            ))}
          </div>
        </div>
      )}

      {gameOver && explainedCuriosities.length > 0 && (
        <div>
          <h2 className="mb-1.5 font-display text-base tracking-wide text-muted">{t("curiositiesExplainedTitle")}</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {explainedCuriosities.map((c, i) => (
              <li key={i} className="px-4 py-3">
                <p className="text-sm font-medium">{c.text}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{c.details}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
