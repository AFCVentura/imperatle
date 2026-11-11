"use client";

import { useLocale, useTranslations } from "next-intl";
import type { KeyboardEvent, ReactNode } from "react";
import type { Clue, RevealedClues } from "@/lib/clues";
import { pickLocalized } from "@/lib/pickLocalized";
import { broadEraFromApi } from "@/lib/types";
import { useTooltip } from "@/lib/useTooltip";

export function useClueName() {
  const t = useTranslations("Game");
  return (clue: Clue) =>
    clue.kind === "era"
      ? t("clues.era")
      : clue.kind === "map"
        ? t(clue.stage === "continents" ? "clues.mapContinents" : "clues.mapCountries")
        : t("clues.curiosity", { n: clue.index + 1 });
}

// Enter or space on a focused clue or badge works like a click.
export function activateOnKey(action: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };
}

// A wrong guess's clue, across the whole width of its pill. The whole row
// opens its explanation (hover, click or tap), never the guess's outline.
export function ClueRow({ clue, revealed }: { clue: Clue; revealed: RevealedClues }) {
  const t = useTranslations("Game");
  const locale = useLocale();
  const name = useClueName()(clue);

  let value: ReactNode = null;
  let info: string;
  if (clue.kind === "era") {
    value = revealed.broadEra !== null ? t(`enums.broadEra.${broadEraFromApi(revealed.broadEra)}`) : null;
    info = t("fieldInfo.era");
  } else if (clue.kind === "map") {
    value = t(clue.stage === "continents" ? "clueValues.mapContinents" : "clueValues.mapCountries");
    info = t(clue.stage === "continents" ? "clueInfo.mapContinents" : "clueInfo.mapCountries");
  } else {
    const hint = revealed.hints?.[clue.index];
    value = hint ? pickLocalized(hint.textEn, hint.textPt, locale, hint.textEs) : null;
    info = t("clueInfo.curiosity");
  }

  const { anchorProps, toggle, tooltip } = useTooltip(
    <>
      <span className="mb-0.5 block font-display font-semibold">{name}</span>
      {info}
    </>,
  );

  const rowProps = {
    ...anchorProps,
    role: "button",
    tabIndex: 0,
    onPointerUp: toggle,
    onKeyDown: activateOnKey(toggle),
  };

  if (clue.kind === "curiosity") {
    return (
      <div {...rowProps} className="cursor-default px-3.5 py-2.5 text-left outline-none focus-visible:bg-background/60">
        <span className="font-display text-[0.6875rem] tracking-wide text-muted">{name}</span>
        <p className="mt-0.5 text-sm leading-snug text-foreground">{value}</p>
        {tooltip}
      </div>
    );
  }

  return (
    <div
      {...rowProps}
      className="flex cursor-default items-baseline justify-center gap-1.5 px-3 py-1.5 outline-none focus-visible:bg-background/60"
    >
      <span className="font-display text-[0.6875rem] tracking-wide text-muted">{clue.kind === "map" ? t("clues.map") : name}:</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
      {tooltip}
    </div>
  );
}
