"use client";

import { useTranslations } from "next-intl";
import type { MapStage } from "@/map/geo";
import { CONTINENTS_AFTER, COUNTRIES_AFTER } from "@/map/stage";
import { useTooltip } from "@/lib/useTooltip";

interface MapStagePickerProps {
  shown: MapStage;
  unlocked: MapStage;
  // Set when a stage was unlocked during this visit: it flashes once, so the
  // player notices the map just gained detail.
  justUnlocked: MapStage | null;
  onPick: (stage: MapStage) => void;
}

// Small text links under the map: outline, continents, countries. A locked
// level is dimmed and says on which attempt it unlocks; an unlocked one
// switches the map to that level.
export function MapStagePicker({ shown, unlocked, justUnlocked, onPick }: MapStagePickerProps) {
  const t = useTranslations("Game");
  const stages: { stage: MapStage; label: string; unlocksAt: number }[] = [
    { stage: 1, label: t("mapStageOutline"), unlocksAt: 0 },
    { stage: 2, label: t("mapStageContinents"), unlocksAt: CONTINENTS_AFTER },
    { stage: 3, label: t("mapStageCountries"), unlocksAt: COUNTRIES_AFTER },
  ];

  return (
    <div role="group" aria-label={t("mapStagesLabel")} className="-mt-3 flex justify-center gap-1 text-xs md:-mt-1">
      {stages.map((s, i) => (
        <span key={s.stage} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-muted/50">·</span>}
          <StageLink
            label={s.label}
            current={s.stage === shown}
            locked={s.stage > unlocked}
            lockedText={t("fields.unlockedAt", { n: s.unlocksAt })}
            flash={s.stage === justUnlocked}
            onPick={() => onPick(s.stage)}
          />
        </span>
      ))}
    </div>
  );
}

function StageLink({
  label,
  current,
  locked,
  lockedText,
  flash,
  onPick,
}: {
  label: string;
  current: boolean;
  locked: boolean;
  lockedText: string;
  flash: boolean;
  onPick: () => void;
}) {
  const { anchorProps, toggle, tooltip } = useTooltip(lockedText);

  if (locked) {
    // aria-disabled rather than disabled: a disabled button gets no pointer
    // events, so the "unlocks on attempt N" tooltip couldn't open.
    return (
      <button {...anchorProps} type="button" aria-disabled onClick={toggle} className="cursor-default px-1 py-0.5 text-muted/45">
        {label}
        {tooltip}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={current}
      onClick={onPick}
      className={
        "rounded px-1 py-0.5 transition-colors " +
        (current ? "font-semibold text-foreground underline underline-offset-4" : "text-muted hover:text-foreground") +
        (flash ? " animate-unlock" : "")
      }
    >
      {label}
    </button>
  );
}
