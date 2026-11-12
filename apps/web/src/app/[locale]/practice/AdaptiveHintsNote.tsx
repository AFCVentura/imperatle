"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { CLUES } from "@/lib/clues";

// Mouse: opens after this rest on the note, closes this long after leaving
// both the note and the panel (time to move from one to the other).
const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 300;
// One clue per wrong guess fits exactly: the daily game's 7 attempts.
const DAILY_ATTEMPTS = CLUES.length + 1;

// Under the "Clues" choice in practice setup: a small note saying whether the
// clues follow the chosen attempts. Hover (mouse) or tap opens a panel with
// the switch (on by default) and what it changes for this many attempts.
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
    <div ref={wrapRef} className="relative self-start" {...hoverProps}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          window.clearTimeout(timer.current);
          setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-3.5 text-highlight" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 11v5" />
          <circle cx="12" cy="7.75" r="0.6" fill="currentColor" />
        </svg>
        {t("adaptive.label")}: <span className="font-semibold text-foreground">{t(adaptive ? "adaptive.on" : "adaptive.off")}</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("adaptive.title")}
          className="absolute left-0 top-full z-30 mt-1.5 flex w-72 max-w-[calc(100vw-3rem)] flex-col gap-2 rounded-xl border border-line bg-background px-3.5 py-3 text-xs leading-relaxed shadow-lg"
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
