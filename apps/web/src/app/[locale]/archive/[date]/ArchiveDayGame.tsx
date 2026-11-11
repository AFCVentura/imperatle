"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ApiStatusError, getArchiveChallenge, getGuessShape, getMapShape, PerkLockedError, submitArchiveGuess } from "@/lib/api";
import { loadGameProgress, saveGameProgress, type GameProgress } from "@/lib/gameStorage";
import { reconcileProgress } from "@/lib/reconcileProgress";
import type { ArchiveChallenge, EmpireSummary } from "@/lib/types";
import { PlayBoard, type PlaySession } from "../../GameBoard";
import { PerkLocked, PerkMessage } from "../../PerkLocked";
import { ShareButton } from "../../ShareButton";

type LoadState =
  | { status: "loading" }
  | { status: "locked" }
  | { status: "notFound" }
  | { status: "error" }
  | { status: "ready"; challenge: ArchiveChallenge; initial: GameProgress | null };

// One past day, on the same board as the daily game. The browser's saved
// copy uses the same key as the daily game (the date), so a day already
// played as the daily shows up as it was left.
export function ArchiveDayGame({ date, empires }: { date: string; empires: EmpireSummary[] }) {
  const t = useTranslations("Archive");
  const tGame = useTranslations("Game");
  const tPerks = useTranslations("Perks");
  const locale = useLocale();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const unknownGuess = tGame("unknownGuess");

  useEffect(() => {
    let current = true;
    getArchiveChallenge(date).then(
      (challenge) =>
        current &&
        setState({
          status: "ready",
          challenge,
          initial: reconcileProgress(date, loadGameProgress(date), challenge, unknownGuess),
        }),
      (e) => {
        if (!current) return;
        if (e instanceof PerkLockedError) setState({ status: "locked" });
        else if (e instanceof ApiStatusError && e.status === 404) setState({ status: "notFound" });
        else setState({ status: "error" });
      },
    );
    return () => {
      current = false;
    };
  }, [date, unknownGuess]);

  const back = (
    <Link href="/archive" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm text-muted hover:text-foreground">
      <span aria-hidden>‹</span> {t("back")}
    </Link>
  );

  if (state.status === "loading") return <PerkMessage>{tPerks("loading")}</PerkMessage>;
  if (state.status === "locked") return <PerkLocked perk="archive" />;
  if (state.status === "error") return <p className="py-8 text-center text-sm text-danger">{tPerks("loadError")}</p>;
  if (state.status === "notFound") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-sm">
        <p className="text-muted">{t("notFound")}</p>
        {back}
        <Link href="/" className="text-muted underline-offset-2 hover:text-foreground hover:underline">
          {t("playToday")}
        </Link>
      </div>
    );
  }

  const { challenge, initial } = state;
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

  const session: PlaySession = {
    key: date,
    attemptsAllowed: challenge.attemptsAllowed,
    hasMap: challenge.hasMap,
    loadShape: () => getMapShape(date),
    loadGuessShape: (empireId) => getGuessShape(date, empireId),
    mapBorderConfidence: challenge.mapBorderConfidence,
    submit: (empireId) => submitArchiveGuess(date, empireId),
    save: saveGameProgress,
    endNote: t("endNote"),
    endActions: (guesses) => (
      <>
        <ShareButton guesses={guesses} challengeNumber={challenge.challengeNumber} attemptsAllowed={challenge.attemptsAllowed} archive />
        <Link href="/archive" className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background">
          {t("back")}
        </Link>
      </>
    ),
  };

  return (
    <>
      <div className="flex w-full max-w-md items-baseline justify-between gap-3">
        {back}
        <p className="font-display text-sm text-muted">
          {t("dayTitle", { number: challenge.challengeNumber })} · {dateLabel}
        </p>
      </div>
      {/* Moving to another day is a new board, not this one's state. */}
      <PlayBoard key={date} session={session} empires={empires} initial={initial} />
    </>
  );
}
