"use client";

import { useTranslations } from "next-intl";
import { HintCard } from "./HintCard";
import type { HintRowData, HintSlot } from "./useHintRows";

interface HintRowProps {
  row: HintRowData;
  variant?: "card" | "cell";
}

const isCuriosity = (slot: HintSlot) => slot.key.startsWith("curiosity");

// Phone: one card per line. From sm up the cards share the row and wrap to a
// new line when they don't fit.
//
// Cells (inside an attempt's pill) are split by dividers instead of wrapping:
// - a row with several regular clues plus a curiosity puts the curiosity on
//   a second line of its own, so neither line gets cramped;
// - one regular clue next to a curiosity gets a fixed share of the width, so
//   a short value isn't squeezed and a long one doesn't take over.
export function HintRow({ row, variant = "card" }: HintRowProps) {
  const t = useTranslations("Game");

  function renderCards(slots: HintSlot[], classNameFor?: (slot: HintSlot) => string) {
    return slots.map((slot) => (
      <HintCard
        key={slot.key}
        label={slot.label}
        value={slot.value}
        unlockedAtLabel={t("fields.unlockedAt", { n: row.attempt })}
        notes={slot.notes}
        notesButtonLabel={t("fields.showNote")}
        variant={variant}
        className={classNameFor?.(slot)}
      />
    ));
  }

  if (variant === "card") {
    return <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:flex-wrap">{renderCards(row.slots)}</div>;
  }

  const cellLine = "flex w-full flex-col divide-y divide-foreground/10 sm:flex-row sm:divide-x sm:divide-y-0";
  const regular = row.slots.filter((s) => !isCuriosity(s));
  const curiosities = row.slots.filter(isCuriosity);

  if (regular.length >= 2 && curiosities.length > 0) {
    return (
      <div className="flex w-full flex-col divide-y divide-foreground/10">
        <div className={cellLine}>{renderCards(regular)}</div>
        <div className={cellLine}>{renderCards(curiosities)}</div>
      </div>
    );
  }

  const mixed = regular.length === 1 && curiosities.length > 0;
  return (
    <div className={cellLine}>
      {renderCards(row.slots, mixed ? (s) => (isCuriosity(s) ? "sm:flex-1" : "sm:flex-none sm:basis-2/5") : undefined)}
    </div>
  );
}
