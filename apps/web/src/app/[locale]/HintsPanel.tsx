"use client";

import { useLocale, useTranslations } from "next-intl";
import { splitAstronomicalYear } from "@/lib/formatYear";
import { pickLocalized } from "@/lib/pickLocalized";
import { borderConfidenceFromApi, broadEraFromApi, continentFromApi, type ChallengeReveal } from "@/lib/types";

interface HintsPanelProps {
  // EmpireAnswer's fields are non-null versions of the same names, so it
  // structurally satisfies this type -- callers pass it as-is at game over.
  reveal: ChallengeReveal;
}

export function HintsPanel({ reveal }: HintsPanelProps) {
  const t = useTranslations("Game");
  const locale = useLocale();

  function formatYear(year: number): string {
    const { absoluteYear, isBce } = splitAstronomicalYear(year);
    return isBce ? t("year.bce", { year: absoluteYear }) : t("year.ce", { year: absoluteYear });
  }

  const rows: { key: string; label: string; value: string }[] = [];

  if (reveal.broadEra !== null) {
    rows.push({ key: "era", label: t("fields.era"), value: t(`enums.broadEra.${broadEraFromApi(reveal.broadEra)}`) });
  }
  if (reveal.mapBorderConfidence !== null) {
    rows.push({
      key: "mapConfidence",
      label: t("fields.mapConfidence"),
      value: t(`enums.borderConfidence.${borderConfidenceFromApi(reveal.mapBorderConfidence)}`),
    });
  }
  if (reveal.continents && reveal.continents.length > 0) {
    rows.push({
      key: "continents",
      label: t("fields.continents"),
      value: reveal.continents.map((c) => t(`enums.continent.${continentFromApi(c)}`)).join(", "),
    });
  }
  if (reveal.subEraEn) {
    rows.push({
      key: "subEra",
      label: t("fields.subEra"),
      value: pickLocalized(reveal.subEraEn, reveal.subEraPt ?? reveal.subEraEn, locale),
    });
  }
  if (reveal.capitalEn) {
    rows.push({
      key: "capital",
      label: t("fields.capital"),
      value: pickLocalized(reveal.capitalEn, reveal.capitalPt ?? reveal.capitalEn, locale),
    });
  }
  if (reveal.languageEn) {
    rows.push({
      key: "language",
      label: t("fields.language"),
      value: pickLocalized(reveal.languageEn, reveal.languagePt ?? reveal.languageEn, locale),
    });
  }
  if (reveal.referenceYear !== null) {
    rows.push({ key: "referenceYear", label: t("fields.referenceYear"), value: formatYear(reveal.referenceYear) });
  }
  if (reveal.startYear !== null && reveal.endYear !== null) {
    rows.push({
      key: "period",
      label: t("fields.period"),
      value: `${formatYear(reveal.startYear)} — ${formatYear(reveal.endYear)}`,
    });
  }
  if (reveal.religionEn) {
    rows.push({
      key: "religion",
      label: t("fields.religion"),
      value: pickLocalized(reveal.religionEn, reveal.religionPt ?? reveal.religionEn, locale),
    });
  }

  if (rows.length === 0 && (!reveal.hints || reveal.hints.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      {rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {rows.map((row) => (
            <div key={row.key} className="contents">
              <dt className="text-zinc-500">{row.label}</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {reveal.hints && reveal.hints.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("fields.curiosities")}</h3>
          <ul className="list-disc pl-5 text-sm">
            {reveal.hints.map((hint, i) => (
              <li key={i}>{pickLocalized(hint.textEn, hint.textPt, locale)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
