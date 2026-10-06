"use client";

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
import { HintCard } from "./HintCard";

interface HintsPanelProps {
  // EmpireAnswer's fields are non-null versions of the same names, so it
  // structurally satisfies this type -- callers pass it as-is at game over.
  reveal: ChallengeReveal;
}

interface Slot {
  key: string;
  label: string;
  value: string | null;
  notes?: string | null;
}

export function HintsPanel({ reveal }: HintsPanelProps) {
  const t = useTranslations("Game");
  const locale = useLocale();

  function formatYear(year: number): string {
    const { absoluteYear, isBce } = splitAstronomicalYear(year);
    return isBce ? t("year.bce", { year: absoluteYear }) : t("year.ce", { year: absoluteYear });
  }

  const durationNotes = reveal.durationNotesEn
    ? pickLocalized(reveal.durationNotesEn, reveal.durationNotesPt ?? reveal.durationNotesEn, locale)
    : null;

  const rows: { attempt: number; slots: Slot[] }[] = [
    {
      attempt: 1,
      slots: [
        {
          key: "era",
          label: t("fields.era"),
          value: reveal.broadEra !== null ? t(`enums.broadEra.${broadEraFromApi(reveal.broadEra)}`) : null,
        },
        {
          key: "mapConfidence",
          label: t("fields.mapConfidence"),
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
          value:
            reveal.continents && reveal.continents.length > 0
              ? reveal.continents.map((c) => t(`enums.continent.${continentFromApi(c)}`)).join(", ")
              : null,
        },
      ],
    },
    {
      attempt: 3,
      slots: [
        {
          key: "subEra",
          label: t("fields.subEra"),
          value: reveal.subEraEn ? pickLocalized(reveal.subEraEn, reveal.subEraPt ?? reveal.subEraEn, locale) : null,
        },
        {
          key: "capital",
          label: t("fields.capital"),
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
          value: reveal.languageEn ? pickLocalized(reveal.languageEn, reveal.languagePt ?? reveal.languageEn, locale) : null,
        },
        {
          key: "curiosity1",
          label: t("fields.curiosity", { n: 1 }),
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
          value: reveal.referenceYear !== null ? formatYear(reveal.referenceYear) : null,
        },
        {
          key: "curiosity2",
          label: t("fields.curiosity", { n: 2 }),
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
          value:
            reveal.startYear !== null && reveal.endYear !== null
              ? `${formatYear(reveal.startYear)} — ${formatYear(reveal.endYear)}`
              : null,
          notes: durationNotes,
        },
        {
          key: "area",
          label: t("fields.area"),
          value:
            reveal.peakAreaKm2 !== null
              ? formatAreaKm2(reveal.peakAreaKm2, locale, areaPrecisionFromApi(reveal.areaPrecision ?? 0) === "Approximate")
              : null,
        },
        {
          key: "religion",
          label: t("fields.religion"),
          value: reveal.religionEn ? pickLocalized(reveal.religionEn, reveal.religionPt ?? reveal.religionEn, locale) : null,
        },
        {
          key: "curiosity3",
          label: t("fields.curiosity", { n: 3 }),
          value: reveal.hints?.[2] ? pickLocalized(reveal.hints[2].textEn, reveal.hints[2].textPt, locale) : null,
        },
      ],
    },
  ];

  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      {rows.map((row) => (
        <div key={row.attempt} className="flex w-full gap-2">
          {row.slots.map((slot) => (
            <HintCard
              key={slot.key}
              label={slot.label}
              value={slot.value}
              unlockedAtLabel={t("fields.unlockedAt", { n: row.attempt })}
              notes={slot.notes}
              notesButtonLabel={t("fields.showNote")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
