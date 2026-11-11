"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { GuessHistoryEntry, GuessProximity } from "@/lib/gameStorage";
import { flatBearing } from "@/lib/flatBearing";
import { pickLocalized } from "@/lib/pickLocalized";
import type { ComparisonResult } from "@/lib/types";
import { useTooltip } from "@/lib/useTooltip";
import { clueFor, type RevealedClues } from "@/lib/clues";
import { activateOnKey, ClueRow, useClueName } from "./Clues";
import { GuessSwatch } from "./MapChips";
import type { MapView } from "@/map/EmpireMap";
import { MarqueeText } from "./MarqueeText";

interface AttemptListProps {
  guesses: GuessHistoryEntry[];
  attemptsAllowed: number;
  revealed: RevealedClues;
  gameOver: boolean;
  // Practice option: wrong guesses unlock no clues.
  hintsOff?: boolean;
  // The guess drawn over the map (index into guesses), or null; clicking a
  // wrong guess's name picks it (or hides it, if it's the one drawn).
  outlined?: number | null;
  onOutline?: (index: number) => void;
  // The map the player is looking at: the distance arrows point its way.
  mapView?: MapView;
}

const COMPARISON_ARROW: Record<ComparisonResult, string> = {
  Bigger: "▲",
  Smaller: "▼",
  Approximate: "≈",
};

// One entry per attempt, newest on top. A wrong guess is a pill: its name
// (click: outline it on the map), how the answer compares with it (area,
// era, distance), and the one clue it unlocked. Unused slots come last, each
// saying which clue it would unlock, so the whole board is visible upfront.
export function AttemptList({ guesses, attemptsAllowed, revealed, gameOver, hintsOff = false, outlined = null, onOutline, mapView = "flat" }: AttemptListProps) {
  const t = useTranslations("Game");
  const clueName = useClueName();

  // Wrong guess n unlocks clue n; a correct guess unlocks nothing.
  const wrongNumberOf = guesses.map((_, i) => guesses.slice(0, i + 1).filter((g) => !g.correct).length);
  const wrongSoFar = guesses.filter((g) => !g.correct).length;

  const emptySlots = gameOver
    ? []
    : Array.from({ length: Math.max(0, attemptsAllowed - guesses.length) }, (_, i) => {
        const number = guesses.length + i + 1;
        return { number, clue: hintsOff ? null : clueFor(wrongSoFar + i + 1) };
      });

  return (
    <div className="flex w-full select-none flex-col gap-2">
      {guesses
        .map((guess, i) => ({ guess, index: i }))
        .reverse()
        .map(({ guess, index }) => {
          const clue = guess.correct || hintsOff ? null : clueFor(wrongNumberOf[index]);
          return guess.correct ? (
            <CorrectGuess key={index} guess={guess} number={index + 1} />
          ) : (
            <WrongGuess
              key={index}
              guess={guess}
              number={index + 1}
              outlined={outlined === index}
              onOutline={onOutline ? () => onOutline(index) : undefined}
              clue={clue ? <ClueRow clue={clue} revealed={revealed} /> : null}
              mapView={mapView}
            />
          );
        })}

      {emptySlots.length > 0 && (
        <div className="flex flex-col gap-1">
          {emptySlots.map(({ number, clue }) => (
            <div
              key={number}
              className="flex h-7 items-center overflow-hidden rounded-full border border-dashed border-line text-xs"
            >
              <span className="flex w-7 shrink-0 items-center justify-center text-muted/60">{number}</span>
              <span className="min-w-0 flex-1 px-1">
                <MarqueeText className="text-muted/70">
                  {clue
                    ? t("unlocksLabel", { fields: clueName(clue) })
                    : number === attemptsAllowed
                      ? t("lastAttempt")
                      : hintsOff
                        ? t("cluesOff")
                        : t("noNewClues")}
                </MarqueeText>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CorrectGuess({ guess, number }: { guess: GuessHistoryEntry; number: number }) {
  const t = useTranslations("Game");
  const locale = useLocale();
  return (
    <div className="flex h-8 items-stretch rounded-full border border-success/50 bg-success/15 text-xs">
      <span className="flex w-7 shrink-0 items-center justify-center text-muted/70">{number}</span>
      <span className="min-w-0 flex-1 self-center px-1">
        <MarqueeText className="font-medium text-muted">{pickLocalized(guess.nameEn, guess.namePt, locale)}</MarqueeText>
      </span>
      <span className="shrink-0 self-center px-3 font-semibold text-success">{t("correctGuessMark")}</span>
    </div>
  );
}

function WrongGuess({
  guess,
  number,
  outlined,
  onOutline,
  clue,
  mapView,
}: {
  guess: GuessHistoryEntry;
  number: number;
  outlined: boolean;
  onOutline?: () => void;
  clue: ReactNode;
  mapView: MapView;
}) {
  const t = useTranslations("Game");
  const locale = useLocale();
  // Explains the click, on hover only: on a phone a tap just does it.
  const { anchorProps, hide, tooltip } = useTooltip(t(outlined ? "outline.hide" : "outline.show"));
  const outlineProps = onOutline
    ? {
        ...anchorProps,
        role: "button",
        tabIndex: 0,
        "aria-pressed": outlined,
        "aria-label": `${pickLocalized(guess.nameEn, guess.namePt, locale)}: ${t(outlined ? "outline.hideLabel" : "outline.showLabel")}`,
        onClick: () => {
          hide();
          onOutline();
        },
        onKeyDown: activateOnKey(onOutline),
      }
    : {};

  return (
    <div className={`rounded-2xl border bg-surface text-xs transition-colors ${outlined ? "border-highlight" : "border-line"}`}>
      <div
        {...outlineProps}
        className={`flex h-8 items-stretch rounded-t-2xl outline-none focus-visible:bg-background/60 ${
          onOutline ? "cursor-pointer hover:bg-background/50" : ""
        }`}
      >
        <span className="flex w-7 shrink-0 items-center justify-center text-muted/70">{number}</span>
        <span role="img" aria-label={t("wrongGuessMark")} className="flex shrink-0 items-center pr-1.5 text-sm font-bold text-danger">
          ✕
        </span>
        <span className="min-w-0 flex-1 self-center px-1">
          <MarqueeText className="font-medium text-muted">
            {outlined && <GuessSwatch className="mr-1.5 inline-block align-[-1px]" />}
            {pickLocalized(guess.nameEn, guess.namePt, locale)}
          </MarqueeText>
        </span>
        {tooltip}
      </div>
      <div className="flex h-7 items-stretch border-t border-line">
        <ComparisonBadge kind="area" result={guess.areaComparison ?? null} />
        <span className="w-px shrink-0 bg-line" />
        <ComparisonBadge kind="era" result={guess.eraComparison ?? null} />
        <span className="w-px shrink-0 bg-line" />
        <ProximityBadge proximity={guess.proximity ?? null} view={mapView} />
      </div>
      {clue && <div className="border-t border-line">{clue}</div>}
    </div>
  );
}

// Shared look of the three comparison cells: the whole cell opens its
// explanation (hover, click or tap).
function Badge({ title, info, children }: { title: string; info: ReactNode; children: ReactNode }) {
  const { anchorProps, toggle, tooltip } = useTooltip(
    <>
      <span className="mb-0.5 block font-display font-semibold">{title}</span>
      {info}
    </>,
  );
  return (
    <span
      {...anchorProps}
      role="button"
      tabIndex={0}
      onPointerUp={toggle}
      onKeyDown={activateOnKey(toggle)}
      className="flex min-w-0 flex-1 cursor-default items-center justify-center gap-1 px-1 font-medium text-foreground outline-none focus-visible:bg-background/60"
    >
      {children}
      {tooltip}
    </span>
  );
}

// "▲ Area" / "≈ Era". Null for guesses saved before the era existed.
function ComparisonBadge({ kind, result }: { kind: "area" | "era"; result: ComparisonResult | null }) {
  const t = useTranslations("Game");
  return (
    <Badge title={t(`guessColumns.${kind}`)} info={result ? t(`comparisonInfo.${kind}.${result}`) : t("comparisonInfo.distance.noMap")}>
      <span aria-hidden>{result ? COMPARISON_ARROW[result] : "–"}</span>
      {t(`guessColumns.${kind}`)}
    </Badge>
  );
}

// Below this share of the two territories together, the direction still
// helps; from it on, the two mostly overlap and an arrow would mislead.
export const SHARES_A_LOT = 0.2;
// Borders closer than this read as "neighbours".
export const NEIGHBOURS_KM = 50;
// From this share of one territory inside the other, it's "inside" (the
// Xiongnu inside the Mongol Empire): the shared part of both together is
// small, but an arrow from one middle to the other would mislead.
export const COVERED = 0.9;

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

type ProximityKind = "inside" | "contains" | "spread" | "shared" | "neighbours" | "distance";

// Where the answer is from the guess, in one cell:
// - one almost inside the other: "inside your guess" / "contains your guess";
// - sharing a lot: only how much they share;
// - either one spread out (colonial empires): "spread out", no arrow, since
//   the middle of such a map is a place players wouldn't link to it;
// - sharing a little: arrow + how much they share;
// - apart: arrow + distance between the borders (or "neighbours").
// The arrow points the way it looks on the map the player is using: the
// shortest route on the globe, the straight line on the flat map.
export function proximityDisplay(p: GuessProximity, view: MapView) {
  const answerInside = (p.answerCovered ?? 0) >= COVERED;
  const guessInside = (p.guessCovered ?? 0) >= COVERED;
  const spread = !!(p.answerSpread || p.guessSpread);
  // Both inside each other = about the same territory: the share says it.
  const kind: ProximityKind =
    answerInside && !guessInside
      ? "inside"
      : guessInside && !answerInside
        ? "contains"
        : p.shared >= SHARES_A_LOT
          ? "shared"
          : spread
            ? "spread"
            : p.shared > 0
              ? "shared"
              : (p.distanceKm ?? 0) < NEIGHBOURS_KM
                ? "neighbours"
                : "distance";
  const showArrow = kind === "shared" ? p.shared < SHARES_A_LOT : kind === "neighbours" || kind === "distance";
  const bearing = view === "flat" && p.guessCentre && p.answerCentre ? flatBearing(p.guessCentre, p.answerCentre) : p.bearingDegrees;
  const percent = p.shared * 100;
  return {
    showArrow,
    kind,
    bearing,
    percent: percent < 1 ? "<1%" : `${Math.round(percent)}%`,
    // Rounded to tens: the borders are sampled, so the last digit means nothing.
    km: Math.round((p.distanceKm ?? 0) / 10) * 10,
    direction: DIRECTIONS[Math.round(bearing / 45) % 8],
  } as const;
}

function ProximityBadge({ proximity, view }: { proximity: GuessProximity | null; view: MapView }) {
  const t = useTranslations("Game");
  const locale = useLocale();
  const title = t("guessColumns.distance");

  if (!proximity) {
    return (
      <Badge title={title} info={t("comparisonInfo.distance.noMap")}>
        <span aria-hidden>–</span>
        {title}
      </Badge>
    );
  }

  const d = proximityDisplay(proximity, view);
  const texts: Record<ProximityKind, string> = {
    inside: t("proximity.inside"),
    contains: t("proximity.contains"),
    spread: t("proximity.spread"),
    shared: t("proximity.shared", { percent: d.percent }),
    neighbours: t("proximity.neighbours"),
    distance: `${d.km.toLocaleString(locale)} km`,
  };
  const spreadInfo =
    proximity.answerSpread && proximity.guessSpread
      ? t("comparisonInfo.distance.spreadBoth")
      : proximity.answerSpread
        ? t("comparisonInfo.distance.spreadAnswer")
        : t("comparisonInfo.distance.spreadGuess");

  return (
    <Badge
      title={title}
      info={
        <>
          {t("comparisonInfo.distance.info")}
          {d.kind === "spread" && <span className="mt-1 block">{spreadInfo}</span>}
          {d.showArrow && (
            <span className="mt-1 block">
              {t("comparisonInfo.distance.here", { direction: t(`directions.${d.direction}`) })}{" "}
              {t(view === "flat" ? "comparisonInfo.distance.arrowFlat" : "comparisonInfo.distance.arrowGlobe")}
            </span>
          )}
        </>
      }
    >
      {d.showArrow ? (
        // Points the exact way, not just the nearest of the 8 directions.
        <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" style={{ transform: `rotate(${d.bearing}deg)` }} aria-hidden>
          <path d="M8 1.5 13 9H9.6v5.5H6.4V9H3z" fill="currentColor" />
        </svg>
      ) : d.kind === "spread" ? (
        // Scattered dots: land in far-apart places.
        <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="currentColor" aria-hidden>
          <circle cx="3.5" cy="4" r="2" />
          <circle cx="12" cy="3.5" r="1.5" />
          <circle cx="8.5" cy="9" r="1.3" />
          <circle cx="3" cy="12.5" r="1.3" />
          <circle cx="12.5" cy="12" r="2" />
        </svg>
      ) : (
        // Two overlapping squares: the shared territory.
        <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden>
          <rect x="1.5" y="1.5" width="8.5" height="8.5" rx="1" />
          <rect x="6" y="6" width="8.5" height="8.5" rx="1" strokeDasharray="2 1.5" />
        </svg>
      )}
      <span className="truncate whitespace-nowrap">{texts[d.kind]}</span>
    </Badge>
  );
}
