"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { formatAreaKm2 } from "@/lib/formatArea";
import { splitAstronomicalYear } from "@/lib/formatYear";
import { pickLocalized } from "@/lib/pickLocalized";
import { areaPrecisionFromApi, borderConfidenceFromApi, continentFromApi, type EmpireAnswer } from "@/lib/types";

// Collapsible section of the end-of-round screen.
export function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <h2 className="font-display text-base tracking-wide text-muted">{title}</h2>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </div>
  );
}

// Everything about the answer that isn't a clue, once the round is over:
// period, peak, area, continents, capital, language, religion, the map's
// precision, and the historical context.
export function EmpireSheet({ answer }: { answer: EmpireAnswer }) {
  const t = useTranslations("Game");
  const locale = useLocale();
  const local = (en: string | undefined, pt: string | undefined, es: string | undefined) => pickLocalized(en ?? "", pt ?? en ?? "", locale, es);

  function year(y: number) {
    const { absoluteYear, isBce } = splitAstronomicalYear(y);
    return isBce ? t("year.bce", { year: absoluteYear }) : t("year.ce", { year: absoluteYear });
  }

  // Primary continents first and in bold, then the rest.
  const primary = (answer.primaryContinents ?? []).filter((c) => answer.continents.includes(c));
  const continents = [...primary, ...answer.continents.filter((c) => !primary.includes(c))].map((c, i) => {
    const name = t(`enums.continent.${continentFromApi(c)}`);
    return (
      <span key={c}>
        {i > 0 && ", "}
        {primary.includes(c) ? <strong className="font-bold">{name}</strong> : name}
      </span>
    );
  });

  // The peak year and the area share a line; everything else takes the full width.
  const rows: { label: string; value: ReactNode; notes?: string; half?: "left" | "right" }[] = [
    {
      label: t("fields.lifespan"),
      value: `${year(answer.startYear)} – ${answer.endYear !== null ? year(answer.endYear) : t("year.present")}`,
      notes: local(answer.durationNotesEn, answer.durationNotesPt, answer.durationNotesEs),
    },
    { label: t("fields.referenceYear"), value: year(answer.referenceYear), half: "left" },
    {
      label: t("fields.area"),
      value: formatAreaKm2(answer.peakAreaKm2, locale, areaPrecisionFromApi(answer.areaPrecision) === "Approximate"),
      half: "right",
    },
    { label: t("fields.continents"), value: continents },
    { label: t("fields.capital"), value: local(answer.capitalEn, answer.capitalPt, answer.capitalEs) },
    { label: t("fields.language"), value: local(answer.languageEn, answer.languagePt, answer.languageEs) },
    { label: t("fields.religion"), value: local(answer.religionEn, answer.religionPt, answer.religionEs), notes: local(answer.religionNotesEn, answer.religionNotesPt, answer.religionNotesEs) },
    { label: t("fields.mapConfidence"), value: t(`enums.borderConfidence.${borderConfidenceFromApi(answer.mapBorderConfidence)}`) },
  ];
  const summary = local(answer.summaryEn, answer.summaryPt, answer.summaryEs);

  return (
    <>
      <dl className="grid grid-cols-2">
        {rows.map((r, i) => (
          <SheetRow key={r.label} {...r} first={i === 0} />
        ))}
      </dl>
      {summary && (
        <div className="border-t border-line px-4 py-3">
          <h3 className="font-display text-[0.6875rem] tracking-wide text-muted">{t("aboutEmpireTitle")}</h3>
          <p className="mt-0.5 text-sm leading-relaxed">{summary}</p>
        </div>
      )}
    </>
  );
}

function SheetRow({
  label,
  value,
  notes,
  half,
  first,
}: {
  label: string;
  value: ReactNode;
  notes?: string;
  half?: "left" | "right";
  first: boolean;
}) {
  const t = useTranslations("Game");
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-line px-4 py-2 ${half ? "" : "col-span-2"} ${first ? "" : "border-t"} ${half === "left" ? "border-r" : ""}`}>
      <dt className="flex items-center gap-1.5 font-display text-[0.6875rem] tracking-wide text-muted">
        {label}
        {notes && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={t("fields.showNote")}
            onClick={() => setOpen((o) => !o)}
            className="flex size-4 items-center justify-center rounded-full bg-muted/20 text-[0.625rem] font-semibold text-foreground hover:bg-muted/35"
          >
            ?
          </button>
        )}
      </dt>
      <dd className="text-sm">{value}</dd>
      {notes && open && <p className="mt-1 text-xs leading-snug text-muted">{notes}</p>}
    </div>
  );
}

// The three curiosities, each with its explanation when it has one.
export function CuriosityList({ answer }: { answer: EmpireAnswer }) {
  const locale = useLocale();
  return (
    <ul className="divide-y divide-line">
      {answer.hints.map((c, i) => {
        const details = pickLocalized(c.detailsEn ?? "", c.detailsPt ?? "", locale, c.detailsEs);
        return (
          <li key={i} className="px-4 py-3">
            <p className="text-sm font-medium">{pickLocalized(c.textEn, c.textPt, locale, c.textEs)}</p>
            {details && <p className="mt-1 text-sm leading-relaxed text-muted">{details}</p>}
          </li>
        );
      })}
    </ul>
  );
}
