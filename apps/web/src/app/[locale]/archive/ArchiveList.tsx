"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getArchive, PerkLockedError } from "@/lib/api";
import { groupArchiveByMonth, type ArchiveFilter } from "@/lib/archive";
import type { ArchiveDay, ArchiveList as ArchiveListData } from "@/lib/types";
import { PerkLocked, PerkMessage } from "../PerkLocked";

type LoadState = { status: "loading" } | { status: "locked" } | { status: "error" } | { status: "ready"; data: ArchiveListData };

const FILTERS: ArchiveFilter[] = ["all", "notPlayed", "played"];

// Past days, newest first and grouped by month, each with the player's
// result. The server decides who may see it (403 = locked).
export function ArchiveList() {
  const t = useTranslations("Archive");
  const tPerks = useTranslations("Perks");
  const locale = useLocale();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [filter, setFilter] = useState<ArchiveFilter>("all");

  useEffect(() => {
    let current = true;
    getArchive().then(
      (data) => current && setState({ status: "ready", data }),
      (e) => current && setState({ status: e instanceof PerkLockedError ? "locked" : "error" }),
    );
    return () => {
      current = false;
    };
  }, []);

  if (state.status === "loading") return <PerkMessage>{tPerks("loading")}</PerkMessage>;
  if (state.status === "locked") return <PerkLocked perk="archive" />;
  if (state.status === "error") return <p className="py-8 text-center text-sm text-danger">{tPerks("loadError")}</p>;

  const { days, attemptsAllowed } = state.data;
  const played = days.filter((d) => d.status === "Won" || d.status === "Lost").length;
  const won = days.filter((d) => d.status === "Won").length;
  const months = groupArchiveByMonth(days, filter);
  const monthFormat = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted">{t("intro")}</p>

      {days.length === 0 ? (
        <PerkMessage>{t("empty")}</PerkMessage>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-sm text-muted">{t("summary", { played, total: days.length, won })}</p>
            <div role="group" aria-label={t("filtersLabel")} className="flex gap-1 text-xs">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={
                    "rounded-full border px-2.5 py-0.5 transition-colors " +
                    (filter === f ? "border-accent bg-accent text-accent-foreground" : "border-line hover:bg-surface")
                  }
                >
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {months.length === 0 && <PerkMessage>{t("emptyFilter")}</PerkMessage>}
          {months.map((month) => (
            <section key={month.key}>
              <h2 className="mb-1.5 font-display text-base tracking-wide text-muted">
                {capitalize(monthFormat.format(new Date(`${month.key}-01T00:00:00Z`)))}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {month.days.map((day) => (
                  <li key={day.date}>
                    <ArchiveRow day={day} attemptsAllowed={attemptsAllowed} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

function ArchiveRow({ day, attemptsAllowed }: { day: ArchiveDay; attemptsAllowed: number }) {
  const t = useTranslations("Archive");
  const locale = useLocale();
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day.date}T00:00:00Z`),
  );

  const mark = { Won: "✓", Lost: "✕", InProgress: "", NotPlayed: "" }[day.status];
  const statusClass = {
    Won: "text-success font-semibold",
    Lost: "text-danger",
    InProgress: "text-foreground",
    NotPlayed: "rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground",
  }[day.status];

  return (
    <Link href={`/archive/${day.date}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-background">
      <span className="w-12 shrink-0 font-display text-muted">#{day.challengeNumber}</span>
      <span className="min-w-0 flex-1 truncate">{capitalize(dateLabel)}</span>
      <span className={`flex shrink-0 items-center gap-1 ${statusClass}`}>
        {mark && <span aria-hidden>{mark}</span>}
        {t(`status.${day.status}`, { used: day.attemptsUsed, total: attemptsAllowed })}
      </span>
    </Link>
  );
}
