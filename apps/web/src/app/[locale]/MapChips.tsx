"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { borderConfidenceFromApi } from "@/lib/types";
import { useTooltip } from "@/lib/useTooltip";
import { activateOnKey } from "./Clues";

// Little chips over the map's corners. After the first click a chip shrinks
// to its icon; hovering opens it again (sliding out), so it stays out of the
// way once the player knows it.
function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  return { collapsed, collapse: () => setCollapsed(true) };
}

const CHIP =
  "group absolute z-10 flex cursor-pointer select-none items-center rounded-full border border-line bg-background/90 px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted shadow-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-highlight/50";

// `before`: the label sits before the icon (the gap goes on its right).
function ChipLabel({ collapsed, before = false, children }: { collapsed: boolean; before?: boolean; children: ReactNode }) {
  const gap = before ? "mr-1.5" : "ml-1.5";
  const hoverGap = before ? "group-hover:mr-1.5" : "group-hover:ml-1.5";
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-out ${
        collapsed ? `max-w-0 opacity-0 group-hover:max-w-56 group-hover:opacity-100 ${hoverGap}` : `max-w-56 ${gap}`
      }`}
    >
      {children}
    </span>
  );
}

// The guess's color on the map, as a legend.
export function GuessSwatch({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`h-2.5 w-3.5 shrink-0 rounded-[3px] border border-dashed ${className}`}
      style={{
        borderColor: "var(--map-guess-line)",
        background: "color-mix(in srgb, var(--map-guess) 35%, transparent)",
      }}
    />
  );
}

// Top-left of the map: which guess is outlined; a click hides or shows it.
// The eye shows the state: open while it's drawn, crossed out while hidden.
export function OutlineChip({ name, on, onToggle }: { name: string; on: boolean; onToggle: () => void }) {
  const t = useTranslations("Game");
  const { collapsed, collapse } = useCollapsed();
  return (
    <button
      type="button"
      onClick={() => {
        onToggle();
        collapse();
      }}
      aria-label={t(on ? "outline.hideLabel" : "outline.showLabel")}
      className={`${CHIP} top-2 left-2 max-w-[60%]`}
    >
      <EyeIcon crossed={!on} />
      <ChipLabel collapsed={collapsed}>
        <span className="flex items-center gap-1.5">
          {on && <GuessSwatch />}
          {on ? name : t("outline.chipShow")}
        </span>
      </ChipLabel>
    </button>
  );
}

function EyeIcon({ crossed = false }: { crossed?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  );
}

// Bottom-left of the map: how exact the borders are, with its explanation.
export function PrecisionChip({ confidence }: { confidence: number }) {
  const t = useTranslations("Game");
  const value = t(`enums.borderConfidence.${borderConfidenceFromApi(confidence)}`).toLowerCase();
  const label = t("precisionChip", { value });
  const { anchorProps, toggle, tooltip } = useTooltip(
    <>
      <span className="mb-0.5 block font-display font-semibold">{t("fields.mapConfidence")}</span>
      {t("fieldInfo.mapConfidence")}
    </>,
  );
  const { collapsed, collapse } = useCollapsed();
  const open = () => {
    toggle();
    collapse();
  };
  return (
    <span
      {...anchorProps}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerUp={open}
      onKeyDown={activateOnKey(open)}
      className={`${CHIP} bottom-2 left-2`}
    >
      <ChipLabel collapsed={collapsed} before>
        {label}
      </ChipLabel>
      <span
        aria-hidden
        className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[0.5625rem] font-semibold text-foreground"
      >
        i
      </span>
      {tooltip}
    </span>
  );
}
