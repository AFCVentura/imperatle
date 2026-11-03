"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getPracticeMap, getPracticePool, getPracticeSession, PerkLockedError, startPractice, submitPracticeGuess } from "@/lib/api";
import type { GameProgress } from "@/lib/gameStorage";
import { loadPracticeOptions, loadPracticeRound, savePracticeOptions, savePracticeRound } from "@/lib/practiceStorage";
import { reconcileProgress } from "@/lib/reconcileProgress";
import {
  BROAD_ERAS,
  CONTINENTS,
  PRACTICE_ATTEMPTS,
  PRACTICE_DIFFICULTIES,
  PRACTICE_MAP_MODES,
  type EmpireSummary,
  type PracticeOptions,
  type PracticeSession,
} from "@/lib/types";
import { PlayBoard, type PlaySession } from "../GameBoard";
import { PerkLocked, PerkMessage } from "../PerkLocked";

type View =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "error" }
  | { status: "setup" }
  | { status: "playing"; round: PracticeSession; initial: GameProgress | null };

// Practice mode: pick the options, play a random empire, play again. The
// round lives on the server (it holds the empire); this page only keeps the
// round id and a display copy, so a reload resumes where it was.
export function PracticeClient({ empires }: { empires: EmpireSummary[] }) {
  const t = useTranslations("Practice");
  const tGame = useTranslations("Game");
  const tPerks = useTranslations("Perks");
  const [view, setView] = useState<View>({ status: "loading" });
  const [options, setOptions] = useState<PracticeOptions>(() => loadPracticeOptions());
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState<"tooFew" | "error" | null>(null);
  const unknownGuess = tGame("unknownGuess");

  // First visit: resume a saved round, or find out (via the pool count)
  // whether the server lets this player in at all.
  useEffect(() => {
    let current = true;
    const saved = loadPracticeRound();
    const onError = (e: unknown) => current && setView({ status: e instanceof PerkLockedError ? "locked" : "error" });

    if (saved) {
      getPracticeSession(saved.id).then(
        (round) =>
          current &&
          setView({
            status: "playing",
            round,
            initial: reconcileProgress(round.id, saved.progress, round, unknownGuess),
          }),
        (e) => {
          if (!current) return;
          if (e instanceof PerkLockedError) return setView({ status: "locked" });
          // Gone or not this player's any more: start over.
          savePracticeRound(null);
          setView({ status: "setup" });
        },
      );
    } else {
      getPracticePool(loadPracticeOptions()).then(() => current && setView({ status: "setup" }), onError);
    }
    return () => {
      current = false;
    };
  }, [unknownGuess]);

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
      if (e instanceof PerkLockedError) setView({ status: "locked" });
      else setStartFailed("error");
    } finally {
      setStarting(false);
    }
  }

  function changeSettings() {
    savePracticeRound(null);
    setStartFailed(null);
    setView({ status: "setup" });
  }

  if (view.status === "loading") return <PerkMessage>{tPerks("loading")}</PerkMessage>;
  if (view.status === "locked") return <PerkLocked perk="practice" />;
  if (view.status === "error") return <p className="py-8 text-center text-sm text-danger">{tPerks("loadError")}</p>;

  if (view.status === "setup") {
    return (
      <PracticeSetup
        options={options}
        onChange={setOptions}
        onStart={() => start(options)}
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
    submit: (empireId) => submitPracticeGuess(round.id, empireId),
    save: (progress) => savePracticeRound({ id: round.id, progress }),
    hints: roundOptions.hints,
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
        <button type="button" onClick={changeSettings} className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
          {t("changeSettings")}
        </button>
      </div>
      {startFailed === "error" && <p className="text-sm text-danger">{t("startError")}</p>}
      {/* A new round is a new board: the key remounts it from scratch. */}
      <PlayBoard key={round.id} session={session} empires={empires} initial={initial} />
    </>
  );
}

function OptionsSummary({ options }: { options: PracticeOptions }) {
  const t = useTranslations("Practice");
  const tGame = useTranslations("Game");
  const parts = [
    t(`difficultyOptions.${options.difficulty}`),
    t("attemptsShort", { count: options.attempts }),
    `${t("hints")}: ${options.hints ? t("hintsOn") : t("hintsOff")}`,
    t(`mapOptions.${options.map}`),
    options.era !== null ? tGame(`enums.broadEra.${BROAD_ERAS[options.era]}`) : null,
    options.continent !== null ? tGame(`enums.continent.${CONTINENTS[options.continent]}`) : null,
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
  starting,
  startFailed,
}: {
  options: PracticeOptions;
  onChange: (options: PracticeOptions) => void;
  onStart: () => void;
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
        <OptionGroup
          label={t("attempts")}
          value={options.attempts}
          choices={PRACTICE_ATTEMPTS.map((n) => ({ value: n as number, label: String(n) }))}
          onPick={(v) => set("attempts", v)}
        />
        <OptionGroup
          label={t("hints")}
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
        <OptionGroup
          label={t("era")}
          value={options.era}
          choices={[
            { value: null, label: t("any") },
            ...BROAD_ERAS.map((era, i) => ({ value: i as number | null, label: tGame(`enums.broadEra.${era}`) })),
          ]}
          onPick={(v) => set("era", v)}
        />
        <OptionGroup
          label={t("continent")}
          value={options.continent}
          choices={[
            { value: null, label: t("any") },
            ...CONTINENTS.map((c, i) => ({ value: i as number | null, label: tGame(`enums.continent.${c}`) })),
          ]}
          onPick={(v) => set("continent", v)}
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
        {startFailed === "error" && <p className="text-sm text-danger">{t("startError")}</p>}
      </div>
    </div>
  );
}

function OptionGroup<T extends string | number | boolean | null>({
  label,
  info,
  value,
  choices,
  onPick,
}: {
  label: string;
  info?: string;
  value: T;
  choices: { value: T; label: string }[];
  onPick: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <p className="font-display text-sm tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {choices.map((choice) => (
          <button
            key={String(choice.value)}
            type="button"
            aria-pressed={choice.value === value}
            onClick={() => onPick(choice.value)}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (choice.value === value ? "border-accent bg-accent text-accent-foreground" : "border-line bg-background hover:bg-surface")
            }
          >
            {choice.label}
          </button>
        ))}
      </div>
      {info && <p className="text-xs leading-relaxed text-muted">{info}</p>}
    </div>
  );
}
