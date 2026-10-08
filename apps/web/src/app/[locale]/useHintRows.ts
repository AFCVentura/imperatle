import { createElement, Fragment, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatAreaKm2 } from "@/lib/formatArea";
import { splitAstronomicalYear } from "@/lib/formatYear";
import { pickLocalized } from "@/lib/pickLocalized";
import {
  areaPrecisionFromApi,
  borderConfidenceFromApi,
  broadEraFromApi,
  continentFromApi,
  type ChallengeReveal,
} from "@/lib/types";

export interface HintSlot {
  key: string;
  label: string;
  // What this kind of clue means (tooltip text).
  description: string;
  // A node rather than plain text so parts of a value can be styled (the
  // primary continent in bold). null = still locked.
  value: ReactNode | null;
  notes?: string | null;
}

export interface HintRowData {
  // The wrong guess that unlocks this row (row N comes with wrong guess N).
  attempt: number;
  slots: HintSlot[];
}

// Builds the hint rows from whatever has been revealed so far. EmpireAnswer's
// fields are non-null versions of the same names, so it structurally
// satisfies ChallengeReveal -- callers pass it as-is at game over.
export function hintRowNames(row: HintRowData, locale: string): string {
  return new Intl.ListFormat(locale, { type: "conjunction" }).format(row.slots.map((s) => s.label));
}

export function useHintRows(reveal: ChallengeReveal): HintRowData[] {
  const t = useTranslations("Game");
  const locale = useLocale();

  function formatYear(year: number): string {
    const { absoluteYear, isBce } = splitAstronomicalYear(year);
    return isBce ? t("year.bce", { year: absoluteYear }) : t("year.ce", { year: absoluteYear });
  }

  // Primary continent first and in bold, then the rest in their content order.
  function formatContinents(): ReactNode {
    const { continents, primaryContinent: primary } = reveal;
    if (!continents || continents.length === 0) return null;

    const ordered =
      primary !== null && continents.includes(primary) ? [primary, ...continents.filter((c) => c !== primary)] : continents;
    return ordered.map((c, i) => {
      const name = t(`enums.continent.${continentFromApi(c)}`);
      return createElement(
        Fragment,
        { key: c },
        i > 0 ? ", " : null,
        c === primary ? createElement("strong", { className: "font-bold" }, name) : name,
      );
    });
  }

  const durationNotes = reveal.durationNotesEn
    ? pickLocalized(reveal.durationNotesEn, reveal.durationNotesPt ?? reveal.durationNotesEn, locale)
    : null;
  const religionNotes = reveal.religionNotesEn
    ? pickLocalized(reveal.religionNotesEn, reveal.religionNotesPt ?? reveal.religionNotesEn, locale)
    : null;

  const rows: HintRowData[] = [
    {
      attempt: 1,
      slots: [
        {
          key: "era",
          label: t("fields.era"),
          description: t("fieldInfo.era"),
          value: reveal.broadEra !== null ? t(`enums.broadEra.${broadEraFromApi(reveal.broadEra)}`) : null,
        },
        {
          key: "mapConfidence",
          label: t("fields.mapConfidence"),
          description: t("fieldInfo.mapConfidence"),
          value:
            reveal.mapBorderConfidence !== null
              ? t(`enums.borderConfidence.${borderConfidenceFromApi(reveal.mapBorderConfidence)}`)
              : null,
        },
      ],
    },
    {
      attempt: 2,
      slots: [
        {
          key: "continents",
          label: t("fields.continents"),
          description: t("fieldInfo.continents"),
          value: formatContinents(),
        },
      ],
    },
    {
      attempt: 3,
      slots: [
        {
          key: "capital",
          label: t("fields.capital"),
          description: t("fieldInfo.capital"),
          value: reveal.capitalEn ? pickLocalized(reveal.capitalEn, reveal.capitalPt ?? reveal.capitalEn, locale) : null,
        },
      ],
    },
    {
      attempt: 4,
      slots: [
        {
          key: "language",
          label: t("fields.language"),
          description: t("fieldInfo.language"),
          value: reveal.languageEn ? pickLocalized(reveal.languageEn, reveal.languagePt ?? reveal.languageEn, locale) : null,
        },
        {
          key: "curiosity1",
          label: t("fields.curiosity"),
          description: t("fieldInfo.curiosity"),
          value: reveal.hints?.[0] ? pickLocalized(reveal.hints[0].textEn, reveal.hints[0].textPt, locale) : null,
        },
      ],
    },
    {
      attempt: 5,
      slots: [
        {
          key: "referenceYear",
          label: t("fields.referenceYear"),
          description: t("fieldInfo.referenceYear"),
          value: reveal.referenceYear !== null ? formatYear(reveal.referenceYear) : null,
        },
        {
          key: "curiosity2",
          label: t("fields.curiosity"),
          description: t("fieldInfo.curiosity"),
          value: reveal.hints?.[1] ? pickLocalized(reveal.hints[1].textEn, reveal.hints[1].textPt, locale) : null,
        },
      ],
    },
    {
      attempt: 6,
      slots: [
        {
          key: "period",
          label: t("fields.period"),
          description: t("fieldInfo.period"),
          value:
            reveal.startYear !== null && reveal.endYear !== null
              ? `${formatYear(reveal.startYear)} – ${formatYear(reveal.endYear)}`
              : null,
          notes: durationNotes,
        },
        {
          key: "area",
          label: t("fields.area"),
          description: t("fieldInfo.area"),
          value:
            reveal.peakAreaKm2 !== null
              ? formatAreaKm2(reveal.peakAreaKm2, locale, areaPrecisionFromApi(reveal.areaPrecision ?? 0) === "Approximate")
              : null,
        },
        {
          key: "religion",
          label: t("fields.religion"),
          description: t("fieldInfo.religion"),
          value: reveal.religionEn ? pickLocalized(reveal.religionEn, reveal.religionPt ?? reveal.religionEn, locale) : null,
          notes: religionNotes,
        },
        {
          key: "curiosity3",
          label: t("fields.curiosity"),
          description: t("fieldInfo.curiosity"),
          value: reveal.hints?.[2] ? pickLocalized(reveal.hints[2].textEn, reveal.hints[2].textPt, locale) : null,
        },
      ],
    },
  ];

  return rows;
}
