"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  DailyNotFinishedError,
  getPracticeGuessShape,
  getPracticeMap,
  getPracticePool,
  getPracticeSession,
  PerkLockedError,
  startPractice,
  submitPracticeGuess,
} from "@/lib/api";
import type { GameProgress } from "@/lib/gameStorage";
import { loadPracticeOptions, loadPracticeRound, savePracticeOptions, savePracticeRound, type SavedPracticeRound } from "@/lib/practiceStorage";
import { reconcileProgress } from "@/lib/reconcileProgress";
import {
  BROAD_ERAS,
  CONTINENTS,
  PRACTICE_DIFFICULTIES,
  PRACTICE_MAP_MODES,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_MIN_ATTEMPTS,
  type EmpireSummary,
  type PracticeOptions,
  type PracticeSession,
} from "@/lib/types";
import { PlayBoard, type PlaySession } from "../GameBoard";
import { PerkLocked, PerkMessage, PracticeNeedsDaily } from "../PerkLocked";
import { AdaptiveHintsNote } from "./AdaptiveHintsNote";
import { DAILY_ATTEMPTS } from "@/lib/clues";

type View =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "dailyFirst" }
  | { status: "error" }
  | { status: "setup" }
  | { status: "playing"; round: PracticeSession; initial: GameProgress | null };

// Practice mode: pick the options, play a random empire, play again. The
// round lives on the server (it holds the empire); this page only keeps the
// round id and a display copy, so a reload resumes where it was. It opens
// only once today's daily game is over (the API answers 409 until then).
//
// openSetup: arrived from the menu (?setup), so the options screen comes
// first, with a button back to a round still in progress.
export function PracticeClient({ empires, openSetup }: { empires: EmpireSummary[]; openSetup: boolean }) {
  const t = useTranslations("Practice");
  const tGame = useTranslations("Game");
  const tPerks = useTranslations("Perks");
  const router = useRouter();
  const [view, setView] = useState<View>({ status: "loading" });
  const [options, setOptions] = useState<PracticeOptions>(() => loadPracticeOptions());
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState<"tooFew" | "error" | null>(null);
  const unknownGuess = tGame("unknownGuess");
  const setupFirst = useRef(openSetup);

  // Back into a saved round (a reload, or "continue" on the options screen).
  function resume(saved: SavedPracticeRound, isCurrent: () => boolean = () => true) {
    getPracticeSession(saved.id).then(
      (round) =>
        isCurrent() &&
        setView({
          status: "playing",
          round,
          initial: reconcileProgress(round.id, saved.progress, round, unknownGuess),
        }),
      (e) => {
        if (!isCurrent()) return;
        const refused = refusal(e);
        // Kept: once today's game is over the same round resumes.
        if (refused) return setView({ status: refused });
        // Gone or not this player's any more: start over.
        savePracticeRound(null);
        setView({ status: "setup" });
      },
    );
  }

  // First visit: resume a saved round, or find out (via the pool count)
  // whether the server lets this player in at all.
  useEffect(() => {
    let current = true;
    const saved = loadPracticeRound();
    const onError = (e: unknown) => current && setView({ status: refusal(e) ?? "error" });

    if (saved && !setupFirst.current) {
      resume(saved, () => current);
    } else {
      getPracticePool(loadPracticeOptions()).then(() => current && setView({ status: "setup" }), onError);
    }
    return () => {
      current = false;
    };
    // resume only reads state setters and unknownGuess.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unknownGuess]);

  // The menu entry while already on this page: back to the options screen
  // (only from a screen the player can use). Adjusted during render, when
  // the prop changes, instead of in an effect.
  const [seenOpenSetup, setSeenOpenSetup] = useState(openSetup);
  if (openSetup !== seenOpenSetup) {
    setSeenOpenSetup(openSetup);
    if (openSetup) {
      setView((v) => (v.status === "playing" || v.status === "setup" ? { status: "setup" } : v));
      setStartFailed(null);
    }
  }

  // The ?setup goes away, so the next click on the menu is a new navigation.
  useEffect(() => {
    if (openSetup) router.replace("/practice");
  }, [openSetup, router]);

  async function start(chosen: PracticeOptions) {
    if (starting) return;
    setStarting(true);
    setStartFailed(null);
    try {
      const round = await startPractice(chosen);
      if (!round) {
        setStartFailed("tooFew");
        setView({ status: "setup" });
        return;
      }
      savePracticeOptions(chosen);
      savePracticeRound({ id: round.id, progress: null });
      setView({ status: "playing", round, initial: null });
    } catch (e) {
      const refused = refusal(e);
      if (refused) setView({ status: refused });
      else setStartFailed("error");
    } finally {
      setStarting(false);
    }
  }

  // The round stays saved: the options screen offers to continue it.
  function changeSettings() {
    setStartFailed(null);
    setView({ status: "setup" });
  }

  if (view.status === "loading") return <PerkMessage>{tPerks("loading")}</PerkMessage>;
  if (view.status === "locked") return <PerkLocked perk="practice" />;
  if (view.status === "dailyFirst") return <PracticeNeedsDaily />;
  if (view.status === "error") return <p className="py-8 text-center text-sm text-danger">{tPerks("loadError")}</p>;

  if (view.status === "setup") {
    // Only a round still being played is worth going back to.
    const saved = loadPracticeRound();
    const unfinished = saved && !saved.progress?.gameOver ? saved : null;
    return (
      <PracticeSetup
        options={options}
        onChange={setOptions}
        onStart={() => start(options)}
        onResume={unfinished ? () => resume(unfinished) : null}
        starting={starting}
        startFailed={startFailed}
      />
    );
  }

  const { round, initial } = view;
  const roundOptions = round.options;
  const session: PlaySession = {
    key: round.id,
    attemptsAllowed: roundOptions.attempts,
    hasMap: round.hasMap,
    loadShape: () => getPracticeMap(round.id),
    loadGuessShape: (empireId) => getPracticeGuessShape(round.id, empireId),
    mapBorderConfidence: round.mapBorderConfidence,
    submit: (empireId) => submitPracticeGuess(round.id, empireId),
    save: (progress) => savePracticeRound({ id: round.id, progress }),
    hints: roundOptions.hints,
    // Rounds started before the option existed come back without it.
    adaptiveHints: roundOptions.adaptiveHints ?? false,
    mapMode: roundOptions.map,
    endNote: t("endNote"),
    endActions: () => (
      <>
        <button
          type="button"
          onClick={() => start(roundOptions)}
          disabled={starting}
          className="rounded-full bg-accent px-5 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85 disabled:opacity-50"
        >
          {starting ? t("starting") : t("playAgain")}
        </button>
        <button type="button" onClick={changeSettings} className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background">
          {t("changeSettings")}
        </button>
      </>
    ),
  };

  return (
    <>
      <div className="flex w-full max-w-md flex-wrap items-center justify-between gap-2">
        <OptionsSummary options={roundOptions} />
        <button
          type="button"
          onClick={changeSettings}
          className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-medium hover:bg-surface"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          {t("changeSettings")}
        </button>
      </div>
      {startFailed === "error" && <p className="text-sm text-danger">{t("startError")}</p>}
      {/* A new round is a new board: the key remounts it from scratch. */}
      <PlayBoard key={round.id} session={session} empires={empires} initial={initial} />
    </>
  );
}

// The two ways the API turns a player away: not a supporter (403), or a
// supporter whose daily game isn't over yet (409).
function refusal(e: unknown): "locked" | "dailyFirst" | null {
  if (e instanceof PerkLockedError) return "locked";
  if (e instanceof DailyNotFinishedError) return "dailyFirst";
  return null;
}

function OptionsSummary({ options }: { options: PracticeOptions }) {
  const t = useTranslations("Practice");
  const tGame = useTranslations("Game");
  const parts = [
    t(`difficultyOptions.${options.difficulty}`),
    t("attemptsShort", { count: options.attempts }),
    `${t("hints")}: ${options.hints ? t("hintsOn") : t("hintsOff")}`,
    t(`mapOptions.${options.map}`),
    options.eras.length > 0 ? options.eras.map((e) => tGame(`enums.broadEra.${BROAD_ERAS[e]}`)).join(", ") : null,
    options.continents.length > 0 ? options.continents.map((c) => tGame(`enums.continent.${CONTINENTS[c]}`)).join(", ") : null,
  ].filter((p): p is string => p !== null);

  return (
    <ul className="flex flex-wrap gap-1 text-xs">
      {parts.map((part) => (
        <li key={part} className="rounded-full border border-line px-2 py-0.5 text-muted">
          {part}
        </li>
      ))}
    </ul>
  );
}

function PracticeSetup({
  options,
  onChange,
  onStart,
  onResume,
  starting,
  startFailed,
}: {
  options: PracticeOptions;
  onChange: (options: PracticeOptions) => void;
  onStart: () => void;
  onResume: (() => void) | null;
  starting: boolean;
  startFailed: "tooFew" | "error" | null;
}) {
  const t = useTranslations("Practice");
  const tGame = useTranslations("Game");
  const [pool, setPool] = useState<{ for: PracticeOptions; count: number } | null>(null);

  useEffect(() => {
    let current = true;
    getPracticePool(options).then(
      (count) => current && setPool({ for: options, count }),
      () => current && setPool(null),
    );
    return () => {
      current = false;
    };
  }, [options]);

  const set = <K extends keyof PracticeOptions>(key: K, value: PracticeOptions[K]) => onChange({ ...options, [key]: value });
  const count = pool?.for === options ? pool.count : null;
  const tooFew = count !== null && count < 2;

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted">{t("intro")}</p>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-4 py-4">
        <OptionGroup
          label={t("difficulty")}
          info={t("difficultyInfo")}
          value={options.difficulty}
          choices={PRACTICE_DIFFICULTIES.map((d) => ({ value: d, label: t(`difficultyOptions.${d}`) }))}
          onPick={(v) => set("difficulty", v)}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="practice-attempts" className="flex items-baseline justify-between font-display text-sm tracking-wide text-muted">
            {t("attempts")}
            <span className="font-sans text-base font-semibold text-foreground tabular-nums">{options.attempts}</span>
          </label>
          <input
            id="practice-attempts"
            type="range"
            min={PRACTICE_MIN_ATTEMPTS}
            max={PRACTICE_MAX_ATTEMPTS}
            step={1}
            value={options.attempts}
            onChange={(e) => set("attempts", Number(e.target.value))}
            style={{ "--range-fill": `${((options.attempts - PRACTICE_MIN_ATTEMPTS) / (PRACTICE_MAX_ATTEMPTS - PRACTICE_MIN_ATTEMPTS)) * 100}%` } as CSSProperties}
            className="range w-full cursor-pointer"
          />
          <div aria-hidden className="flex justify-between text-xs text-muted tabular-nums">
            <span>{PRACTICE_MIN_ATTEMPTS}</span>
            <span>{PRACTICE_MAX_ATTEMPTS}</span>
          </div>
        </div>
        <OptionGroup
          label={t("hints")}
          // Only where it changes something: clues on, and not the daily 7.
          labelExtra={
            options.hints && options.attempts !== DAILY_ATTEMPTS ? (
              <AdaptiveHintsNote attempts={options.attempts} adaptive={options.adaptiveHints} onChange={(v) => set("adaptiveHints", v)} />
            ) : null
          }
          info={t("hintsInfo")}
          value={options.hints}
          choices={[
            { value: true, label: t("hintsOn") },
            { value: false, label: t("hintsOff") },
          ]}
          onPick={(v) => set("hints", v)}
        />
        <OptionGroup
          label={t("map")}
          info={t("mapInfo")}
          value={options.map}
          choices={PRACTICE_MAP_MODES.map((m) => ({ value: m, label: t(`mapOptions.${m}`) }))}
          onPick={(v) => set("map", v)}
        />
        <MultiOptionGroup
          label={t("era")}
          info={t("multiInfo")}
          anyLabel={t("any")}
          selected={options.eras}
          labels={BROAD_ERAS.map((era) => tGame(`enums.broadEra.${era}`))}
          onChange={(v) => set("eras", v)}
        />
        <MultiOptionGroup
          label={t("continent")}
          anyLabel={t("any")}
          selected={options.continents}
          labels={CONTINENTS.map((c) => tGame(`enums.continent.${c}`))}
          onChange={(v) => set("continents", v)}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p aria-live="polite" className={`text-sm ${tooFew || startFailed === "tooFew" ? "text-danger" : "text-muted"}`}>
          {tooFew || startFailed === "tooFew" ? t("poolTooSmall") : count !== null ? t("pool", { count }) : "\u00a0"}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={starting || tooFew}
          className="rounded-full bg-accent px-8 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85 disabled:opacity-40 disabled:hover:bg-accent"
        >
          {starting ? t("starting") : t("start")}
        </button>
        {onResume && (
          <button type="button" onClick={onResume} className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline">
            {t("resume")}
          </button>
        )}
        {startFailed === "error" && <p className="text-sm text-danger">{t("startError")}</p>}
      </div>
    </div>
  );
}

const chipClass = (on: boolean) =>
  "rounded-full border px-3 py-1 text-sm transition-colors " +
  (on ? "border-accent bg-accent text-accent-foreground" : "border-line bg-background hover:bg-surface");

// Several picks at once (indexes into labels). "Any" is the empty list and
// never sits with the others: picking it clears them, picking one of them
// turns it off, and picking every one is the same as "any".
function MultiOptionGroup({
  label,
  info,
  anyLabel,
  selected,
  labels,
  onChange,
}: {
  label: string;
  info?: string;
  anyLabel: string;
  selected: number[];
  labels: string[];
  onChange: (selected: number[]) => void;
}) {
  function toggle(i: number) {
    const next = selected.includes(i) ? selected.filter((s) => s !== i) : [...selected, i].sort((a, b) => a - b);
    onChange(next.length === labels.length ? [] : next);
  }

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <p className="font-display text-sm tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={selected.length === 0} onClick={() => onChange([])} className={chipClass(selected.length === 0)}>
          {anyLabel}
        </button>
        {labels.map((text, i) => (
          <button key={i} type="button" aria-pressed={selected.includes(i)} onClick={() => toggle(i)} className={chipClass(selected.includes(i))}>
            {text}
          </button>
        ))}
      </div>
      {info && <p className="text-xs leading-relaxed text-muted">{info}</p>}
    </div>
  );
}

function OptionGroup<T extends string | number | boolean | null>({
  label,
  labelExtra,
  info,
  value,
  choices,
  onPick,
}: {
  label: string;
  // Next to the label, e.g. an info button.
  labelExtra?: ReactNode;
  info?: string;
  value: T;
  choices: { value: T; label: string }[];
  onPick: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <p className="font-display text-sm tracking-wide text-muted">{label}</p>
        {labelExtra}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {choices.map((choice) => (
          <button
            key={String(choice.value)}
            type="button"
            aria-pressed={choice.value === value}
            onClick={() => onPick(choice.value)}
            className={chipClass(choice.value === value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {info && <p className="text-xs leading-relaxed text-muted">{info}</p>}
    </div>
  );
}
