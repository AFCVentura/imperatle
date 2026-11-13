"use client";

import type { MultiPolygon } from "geojson";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { getGuessShape, getMapShape, getTodayProgress, submitGuess } from "@/lib/api";
import { EmpireMap, savedMode, type MapView } from "@/map/EmpireMap";
import type { MapLocale, MapStage } from "@/map/geo";
import { mapStageForMode, type MapMode } from "@/map/stage";
import { openStats } from "@/lib/dialogs";
import { Link } from "@/i18n/navigation";
import { useMe } from "@/lib/me";
import {
  comparisonFields,
  loadGameProgress,
  saveGameProgress,
  type GameProgress,
  type GuessHistoryEntry,
} from "@/lib/gameStorage";
import { pickLocalized } from "@/lib/pickLocalized";
import { reconcileProgress } from "@/lib/reconcileProgress";
import type { ChallengeReveal, EmpireAnswer, EmpireSummary, GuessResponse, TodayChallenge } from "@/lib/types";
import { EmpireAutocomplete } from "./EmpireAutocomplete";
import { AttemptList } from "./AttemptList";
import { clueStep, type RevealedClues } from "@/lib/clues";
import { Accordion, CuriosityList, EmpireSheet } from "./EmpireSheet";
import { OutlineChip, PrecisionChip } from "./MapChips";
import { MapStagePicker } from "./MapStagePicker";
import { ShareButton } from "./ShareButton";

// One round of the game, wherever it comes from: today's challenge, a past
// day (archive) or a practice round. The board is the same; only where the
// guesses go, how progress is saved and what the end card offers change.
export interface PlaySession {
  // Identifies the round (a date, or a practice id) for saving and the map.
  key: string;
  attemptsAllowed: number;
  hasMap: boolean;
  loadShape: () => Promise<MultiPolygon>;
  // A guessed empire's shape, to outline it over the map (only empires
  // already guessed in this round).
  loadGuessShape?: (empireId: number) => Promise<MultiPolygon>;
  // How exact the map's borders are (BORDER_CONFIDENCES index), on the map
  // from the start.
  mapBorderConfidence?: number | null;
  submit: (empireId: number) => Promise<GuessResponse>;
  save: (progress: GameProgress) => void;
  // false = no clue rows until the round ends (practice option).
  hints?: boolean;
  // Practice option: the clues (map levels included) spread over the
  // attempts instead of one per wrong guess (lib/clues, clueStep).
  adaptiveHints?: boolean;
  // Practice option: false = guesses are never outlined on the map.
  guessOutlines?: boolean;
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
  const me = useMe();
  if (!hydrated) return null;

  const session: PlaySession = {
    key: challenge.date,
    attemptsAllowed: challenge.attemptsAllowed,
    hasMap: challenge.hasMap,
    loadShape: () => getMapShape(challenge.date),
    loadGuessShape: (empireId) => getGuessShape(challenge.date, empireId),
    mapBorderConfidence: challenge.mapBorderConfidence,
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
        {/* Practice opens once today's game is over (the API decides). */}
        {me?.user?.isSupporter && (
          <Link href="/practice" className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background">
            {t("goToPractice")}
          </Link>
        )}
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
  // Without clues the map keeps the daily pace.
  const adaptiveHints = hints && (session.adaptiveHints ?? false);
  const cluesOut = (wrongGuesses: number) => clueStep(wrongGuesses, session.attemptsAllowed, adaptiveHints);

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
    mapStageForMode(mapMode, cluesOut(initial?.guesses.filter((g) => !g.correct).length ?? 0), initial?.gameOver ?? false),
  );
  // Guessed empires' shapes, by empire id, loaded when first outlined.
  const [guessShapes, setGuessShapes] = useState<Record<number, MultiPolygon | "failed">>({});
  // The outlined guess: the latest wrong one, unless the player picked
  // another since the last guess (`at` = how many guesses there were then).
  const [pickedOutline, setPickedOutline] = useState<{ index: number; at: number } | null>(null);
  // Hidden until the player asks for it: the outline gives away direction
  // and size at a glance, so it's an extra help, not the default.
  const [outlineOn, setOutlineOn] = useState(false);
  // Flat map or globe, as the map shows it: the distance arrows follow it.
  const [mapView, setMapView] = useState<MapView>(savedMode);

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

  const lastWrongIndex = guesses.findLastIndex((g) => !g.correct);
  const outlinedIndex = pickedOutline?.at === guesses.length ? pickedOutline.index : lastWrongIndex;
  const outlinedGuess = outlinedIndex >= 0 && !guesses[outlinedIndex]?.correct ? guesses[outlinedIndex] : null;
  // Placeholder rows (guesses made on another device before they were
  // stored) have no empire to draw.
  const outlinedEmpireId = outlinedGuess && outlinedGuess.empireId > 0 ? outlinedGuess.empireId : null;
  const outlinedShape = outlinedEmpireId !== null ? guessShapes[outlinedEmpireId] : undefined;
  const canOutline = hasMap && shape !== "failed" && !!session.loadGuessShape && session.guessOutlines !== false;

  useEffect(() => {
    const load = sessionRef.current.loadGuessShape;
    if (!canOutline || !load || outlinedEmpireId === null || outlinedShape !== undefined) return;
    let current = true;
    load(outlinedEmpireId).then(
      (s) => current && setGuessShapes((prev) => ({ ...prev, [outlinedEmpireId]: s })),
      () => current && setGuessShapes((prev) => ({ ...prev, [outlinedEmpireId]: "failed" })),
    );
    return () => {
      current = false;
    };
  }, [canOutline, outlinedEmpireId, outlinedShape]);

  const guessShape = outlinedShape && outlinedShape !== "failed" ? outlinedShape : null;
  // Framed on the answer and the outlined guess together while the guess is
  // shown, so it's in view; hidden, the frame (and the focus button) is the
  // answer alone.
  const shownGuess = canOutline && outlineOn ? guessShape : null;
  const frame = useMemo<MultiPolygon | undefined>(
    () =>
      shownGuess && shape && shape !== "failed"
        ? { type: "MultiPolygon", coordinates: [...shape.coordinates, ...shownGuess.coordinates] }
        : undefined,
    [shownGuess, shape],
  );

  function toggleOutline(index: number) {
    // The outlined guess again: hide (or show) it; another one: show that one.
    if (index === outlinedIndex) {
      setOutlineOn((on) => !on);
      return;
    }
    setPickedOutline({ index, at: guesses.length });
    setOutlineOn(true);
  }

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
          nameEs: empire.nameEs,
          correct: result.correct,
          ...comparisonFields(result.comparison),
        },
      ]);
      if (result.reveal) setReveal(result.reveal);
      // A new guess keeps the outline as the player left it (shown or hidden).
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

  const revealed: RevealedClues =
    gameOver && answer
      ? { broadEra: answer.broadEra, hints: answer.hints }
      : { broadEra: reveal?.broadEra ?? null, hints: reveal?.hints ?? null };
  const borderConfidence = session.mapBorderConfidence ?? reveal?.mapBorderConfidence ?? answer?.mapBorderConfidence ?? null;

  const lastGuess = guesses[guesses.length - 1];
  const wrongGuessCount = guesses.filter((g) => !g.correct).length;
  const wikipediaUrl = answer ? pickLocalized(answer.wikipediaEn ?? "", answer.wikipediaPt ?? "", locale, answer.wikipediaEs) : "";

  // The map shows the most detailed level unlocked so far, unless the player
  // picked another one under it; a new unlock switches to it again.
  const unlockedStage = mapStageForMode(mapMode, cluesOut(wrongGuessCount), gameOver);
  const shownStage = pickedStage?.unlocked === unlockedStage ? pickedStage.stage : unlockedStage;
  const justUnlocked = unlockedStage > stageOnArrival ? unlockedStage : null;
  // An outline-only round has nothing to pick until it's over.
  const showStagePicker = mapMode !== "Outline" || gameOver;

  const attemptList = (
    <AttemptList
      guesses={guesses}
      attemptsAllowed={session.attemptsAllowed}
      revealed={revealed}
      gameOver={gameOver}
      hintsOff={!hints}
      adaptiveHints={adaptiveHints}
      outlined={shownGuess ? outlinedIndex : null}
      onOutline={canOutline ? toggleOutline : undefined}
      mapView={mapView}
    />
  );

  return (
    // Phone-sized column on every screen, so the PC looks like the mobile layout.
    <div className="flex w-full max-w-md flex-col gap-6 md:gap-3">
      {hasMap && shape !== "failed" ? (
        <>
          <div className="relative">
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
                guess={shownGuess}
                onModeChange={setMapView}
                frameShape={frame}
                // Same height as the old map card: capped at 30% of the screen
                // height, so the map never takes over short screens. Tablets
                // have room for a taller one.
                className="h-[calc(min(15rem,30dvh)+1.5rem)] w-full tablet:h-[calc(min(20rem,36dvh)+1.5rem)]"
              />
            </div>
            {shape && borderConfidence !== null && <PrecisionChip confidence={borderConfidence} />}
            {canOutline && outlinedGuess && guessShape && (
              <OutlineChip
                name={pickLocalized(outlinedGuess.nameEn, outlinedGuess.namePt, locale, outlinedGuess.nameEs)}
                on={outlineOn}
                onToggle={() => setOutlineOn((on) => !on)}
              />
            )}
          </div>
          {showStagePicker && (
            <MapStagePicker
              shown={shownStage}
              unlocked={unlockedStage}
              justUnlocked={justUnlocked}
              onPick={(stage) => setPickedStage({ stage, unlocked: unlockedStage })}
              attemptsAllowed={session.attemptsAllowed}
              adaptiveHints={adaptiveHints}
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

      {gameOver && answer && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <h2 className="font-display text-xl">{lastGuess?.correct ? t("correctTitle") : t("gameOverTitle")}</h2>
          <p className="mt-1 text-sm">
            {t("answerWasLabel")}: <strong>{pickLocalized(answer.nameEn, answer.namePt, locale, answer.nameEs)}</strong>
          </p>
          {session.endNote && <p className="mt-1 text-sm text-muted">{session.endNote}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {session.endActions?.(guesses)}
            <Link
              href={`/empires/${answer.slug}`}
              className="inline-flex items-center rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background"
            >
              {t("empirePage")}
            </Link>
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

      {gameOver && answer ? (
        // End of the round: the answer's sheet first, then the guesses and
        // clues, then the curiosities with their explanations.
        <>
          <Accordion title={t("sheetTitle")} defaultOpen>
            <EmpireSheet answer={answer} />
          </Accordion>
          <Accordion title={`${t("guessHistoryTitle")} (${guesses.length}/${session.attemptsAllowed})`}>
            <div className="p-2">{attemptList}</div>
          </Accordion>
          {answer.hints.length > 0 && (
            <Accordion title={t("curiositiesTitle")}>
              <CuriosityList answer={answer} />
            </Accordion>
          )}
        </>
      ) : (
        <div>
          <div className="mb-1.5 flex select-none items-baseline justify-between gap-3">
            <h2 className="font-display text-base tracking-wide text-muted">{t("guessHistoryTitle")}</h2>
            <p className="font-display text-sm text-muted">
              {t("attempts", { used: guesses.length, total: session.attemptsAllowed })}
            </p>
          </div>
          {attemptList}
        </div>
      )}
    </div>
  );
}
