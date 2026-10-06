"use client";

import { useState } from "react";
import { MarqueeText } from "./MarqueeText";

interface HintCardProps {
  label: string;
  value: string | null;
  unlockedAtLabel: string;
  notes?: string | null;
  notesButtonLabel?: string;
  // "card": standalone bordered card. "cell": flat cell inside an attempt's
  // pill, which draws the border and the dividers.
  variant?: "card" | "cell";
  className?: string;
}

// Locked: shows the category label by default, "unlocked on attempt N" on
// hover. Unlocked: shows the revealed value by default, the category label
// on hover. Both states use the same crossfade so the interaction feels
// consistent either way. Touch screens have no hover, so a tap flips the
// card instead (Tailwind's hover: only applies on devices that can hover).
export function HintCard({ label, value, unlockedAtLabel, notes, notesButtonLabel, variant = "card", className = "" }: HintCardProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const unlocked = value !== null;
  const front = unlocked ? value : label;
  const back = unlocked ? label : unlockedAtLabel;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      // Mouse users already get the flip on hover; flipping on click too
      // would leave the card stuck on its back after the pointer leaves.
      onPointerUp={(e) => {
        if (e.pointerType !== "mouse") setFlipped((f) => !f);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      className={`group relative flex min-w-0 flex-auto cursor-default select-none flex-col items-center justify-center px-3 py-1.5 text-center transition-colors ${
        variant === "cell"
          ? ""
          : `rounded-2xl border ${unlocked ? "border-foreground/15 bg-foreground/[0.04]" : "border-dashed border-foreground/15"}`
      } ${className}`}
    >
      {/* Front and back share one grid cell instead of being absolutely
          positioned, so the card's natural width is the wider of the two --
          that's what lets each card grow to fit its text. */}
      <div className="grid w-full grid-cols-[minmax(0,1fr)] leading-4">
        <MarqueeText
          className={`[grid-area:1/1] text-xs font-medium transition-opacity duration-200 group-hover:opacity-0 ${
            flipped ? "opacity-0" : ""
          } ${unlocked ? "text-foreground" : "text-foreground/45"}`}
        >
          {front}
        </MarqueeText>
        <MarqueeText
          className={`[grid-area:1/1] text-xs font-medium text-foreground/60 transition-opacity duration-200 group-hover:opacity-100 ${
            flipped ? "opacity-100" : "opacity-0"
          }`}
        >
          {back}
        </MarqueeText>
      </div>

      {unlocked && notes && (
        <>
          <button
            type="button"
            aria-label={notesButtonLabel}
            onClick={(e) => {
              e.stopPropagation();
              setNotesOpen((open) => !open);
            }}
            // Keep a tap on "?" from also flipping the card.
            onPointerUp={(e) => e.stopPropagation()}
            onMouseEnter={() => setNotesOpen(true)}
            onMouseLeave={() => setNotesOpen(false)}
            className={`absolute flex h-4 w-4 ${variant === "cell" ? "right-1 top-1" : "-right-1.5 -top-1.5"} items-center justify-center rounded-full bg-foreground/15 text-[10px] font-semibold text-foreground/80 hover:bg-foreground/25`}
          >
            ?
          </button>
          {notesOpen && (
            <div className="absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-foreground/10 bg-background p-2.5 text-left text-xs leading-snug text-foreground shadow-lg">
              {notes}
            </div>
          )}
        </>
      )}
    </div>
  );
}
