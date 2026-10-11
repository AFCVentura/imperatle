"use client";

import { useLocale, useTranslations } from "next-intl";
import { RELEASES, type Localized } from "@/lib/changelog";
import { CHANGELOG_EVENT } from "@/lib/dialogs";
import { AppDialog } from "./AppDialog";

// Every version of the game, newest first, opened from the version number in
// the footer.
export function ChangelogDialog() {
  const t = useTranslations("Changelog");
  const locale = useLocale();
  const text = (l: Localized) => (locale === "pt" ? l.pt : l.en);
  // Noon, so the date doesn't shift a day in any time zone.
  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <AppDialog event={CHANGELOG_EVENT} title={t("title")} selectable>
      {RELEASES.map((release) => (
        <section key={release.version} className="flex flex-col gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
          <h3 className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-lg">{t("version", { version: release.version })}</span>
            <span className="text-xs text-muted">{formatDate(release.date)}</span>
          </h3>
          <Group title={t("empires", { count: release.empires.length })} items={release.empires.map(text).sort((a, b) => a.localeCompare(b, locale))} />
          <Group title={t("features")} items={release.features.map(text)} />
          <Group title={t("fixes")} items={release.fixes.map(text)} />
        </section>
      ))}
    </AppDialog>
  );
}

function Group({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-semibold text-muted">{title}</h4>
      <ul className="list-disc pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
