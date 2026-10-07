"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { getStats } from "@/lib/api";
import { STATS_EVENT } from "@/lib/dialogs";
import { loadGameProgress, type GuessHistoryEntry } from "@/lib/gameStorage";
import type { StatsResponse } from "@/lib/types";
import { AppDialog } from "./AppDialog";
import { ShareButton } from "./ShareButton";
import { TowerChart, type Tower } from "./TowerChart";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; stats: StatsResponse };

// Stats are fetched fresh on every open, so they reflect a game that just ended.
export function StatsDialog() {
  const t = useTranslations("Stats");
  const locale = useLocale();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [todayGuesses, setTodayGuesses] = useState<GuessHistoryEntry[]>([]);

  async function load() {
    setState({ status: "loading" });
    try {
      const stats = await getStats();
      setTodayGuesses(loadGameProgress(stats.today.date)?.guesses ?? []);
      setState({ status: "ready", stats });
    } catch {
      setState({ status: "error" });
    }
  }

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <AppDialog event={STATS_EVENT} title={t("title")} onOpen={load}>
      {state.status === "loading" && <p className="py-8 text-center text-muted">{t("loading")}</p>}
      {state.status === "error" && <p className="py-8 text-center text-danger">{t("loadError")}</p>}
      {state.status === "ready" && <StatsContent stats={state.stats} todayGuesses={todayGuesses} number={number} />}
    </AppDialog>
  );
}

function StatsContent({
  stats,
  todayGuesses,
  number,
}: {
  stats: StatsResponse;
  todayGuesses: GuessHistoryEntry[];
  number: Intl.NumberFormat;
}) {
  const t = useTranslations("Stats");
  const { me, today } = stats;
  const attemptLabels = Array.from({ length: today.attemptsAllowed }, (_, i) => i + 1);

  const myTowers: Tower[] = [
    ...attemptLabels.map((attempt) => ({
      key: String(attempt),
      label: String(attempt),
      value: me.distribution[attempt - 1] ?? 0,
      highlight: me.todayResult?.correct === true && me.todayResult.attempts === attempt,
      tooltip: t("barWin", {
        attempt,
        count: me.distribution[attempt - 1] ?? 0,
      }),
    })),
    {
      key: "x",
      label: "✕",
      value: me.played - me.wins,
      highlight: me.todayResult?.correct === false,
      tooltip: t("barLoss", { count: me.played - me.wins }),
    },
  ];

  const percent = (count: number) => (today.players > 0 ? Math.round((count / today.players) * 100) : 0);
  const communityTowers: Tower[] = [
    ...attemptLabels.map((attempt) => {
      const count = today.distribution[attempt - 1] ?? 0;
      return {
        key: String(attempt),
        label: String(attempt),
        value: count,
        valueLabel: `${percent(count)}%`,
        highlight: me.todayResult?.correct === true && me.todayResult.attempts === attempt,
        tooltip: t("communityBarWin", { attempt, pct: percent(count), count }),
      };
    }),
    {
      key: "x",
      label: "✕",
      value: today.players - today.wins,
      valueLabel: `${percent(today.players - today.wins)}%`,
      highlight: me.todayResult?.correct === false,
      tooltip: t("communityBarLoss", {
        pct: percent(today.players - today.wins),
        count: today.players - today.wins,
      }),
    },
  ];

  const tiles = [
    { label: t("played"), value: me.played },
    {
      label: t("winRate"),
      value: me.played > 0 ? `${Math.round((me.wins / me.played) * 100)}%` : "–",
    },
    { label: t("currentStreak"), value: me.currentStreak },
    { label: t("maxStreak"), value: me.maxStreak },
  ];

  return (
    <>
      <div className="grid grid-cols-4 gap-2 text-center">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col items-center">
            <span className="font-display text-2xl tabular-nums">{tile.value}</span>
            <span className="text-[11px] leading-tight text-muted">{tile.label}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="font-display text-base text-muted">{t("myDistribution")}</h3>
        {me.played > 0 ? (
          <TowerChart towers={myTowers} caption={t("myDistribution")} />
        ) : (
          <p className="text-muted">{t("noGamesYet")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-display text-base text-muted">{t("todayTitle", { number: today.challengeNumber })}</h3>
        {today.players > 0 ? (
          <>
            <p>
              {t("todaySummary", {
                players: today.players,
                rate: percent(today.wins),
              })}
              {today.averageAttempts !== null && (
                <>
                  <br />
                  {t("averageLine", {
                    avg: number.format(today.averageAttempts),
                  })}
                  {me.todayResult &&
                    ` ${me.todayResult.correct ? t("yourResult", { attempts: me.todayResult.attempts }) : t("yourResultLost")}`}
                </>
              )}
            </p>
            <TowerChart towers={communityTowers} caption={t("todayTitle", { number: today.challengeNumber })} />
          </>
        ) : (
          <p className="text-muted">{t("nobodyYet")}</p>
        )}
      </section>

      {me.todayResult && todayGuesses.length > 0 && (
        <div className="flex justify-center pt-1">
          <ShareButton
            guesses={todayGuesses}
            challengeNumber={today.challengeNumber}
            attemptsAllowed={today.attemptsAllowed}
          />
        </div>
      )}
    </>
  );
}
