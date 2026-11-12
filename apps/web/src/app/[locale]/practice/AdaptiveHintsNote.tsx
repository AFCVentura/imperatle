"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { CLUES, DAILY_ATTEMPTS } from "@/lib/clues";

// Mouse: opens after this rest on the note, closes this long after leaving
// both the note and the panel (time to move from one to the other).
const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 300;

// Info icon next to the "Clues" title in practice setup (hidden with the
// daily 7 attempts, where it changes nothing). Hover (mouse) or tap opens a
// panel with the switch (on by default) and what it changes for this many
// attempts.
// Unlike the explanatory tooltips (lib/useTooltip), this panel takes clicks.
export function AdaptiveHintsNote({
  attempts,
  adaptive,
  onChange,
}: {
  attempts: number;
  adaptive: boolean;
  onChange: (adaptive: boolean) => void;
}) {
  const t = useTranslations("Practice");
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const later = (next: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), ms);
  };
  const hoverProps = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") later(true, open ? 0 : OPEN_DELAY_MS);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") later(false, CLOSE_DELAY_MS);
    },
  };

  // What the switch changes with this many attempts, in one line.
  const effect =
    attempts === DAILY_ATTEMPTS
      ? t("adaptive.same", { count: attempts })
      : attempts < DAILY_ATTEMPTS
        ? adaptive
          ? t("adaptive.fewOn", { count: attempts })
          : t("adaptive.fewOff", { count: attempts, shown: attempts - 1 })
        : adaptive
          ? t("adaptive.manyOn", { count: attempts })
          : t("adaptive.manyOff", { count: attempts, last: CLUES.length });

  return (
    <div ref={wrapRef} className="relative flex" {...hoverProps}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t("adaptive.label")}: ${t(adaptive ? "adaptive.on" : "adaptive.off")}`}
        onClick={() => {
          window.clearTimeout(timer.current);
          setOpen((o) => !o);
        }}
        className="-m-1 rounded-full p-1 text-highlight transition-opacity hover:opacity-75"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 11v5" />
          <circle cx="12" cy="7.75" r="0.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("adaptive.title")}
          className="absolute -left-16 top-full z-30 mt-1.5 flex w-72 max-w-[calc(100vw-3rem)] flex-col gap-2 rounded-xl border border-line bg-background px-3.5 py-3 text-xs leading-relaxed shadow-lg"
        >
          <p className="font-display text-sm font-semibold">{t("adaptive.title")}</p>
          <p>{t("adaptive.body")}</p>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-surface px-2.5 py-2">
            <span className="font-medium">{t("adaptive.switch")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={adaptive}
              onClick={() => onChange(!adaptive)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${adaptive ? "bg-accent" : "bg-line"}`}
            >
              <span
                aria-hidden
                className={`absolute top-0.5 size-4 rounded-full bg-background shadow transition-[left] ${adaptive ? "left-[1.125rem]" : "left-0.5"}`}
              />
            </button>
          </label>
          <p className="text-muted">{effect}</p>
        </div>
      )}
    </div>
  );
}
