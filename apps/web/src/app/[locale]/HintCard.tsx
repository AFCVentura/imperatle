"use client";

import { useState } from "react";

interface HintCardProps {
  label: string;
  value: string | null;
  unlockedAtLabel: string;
  notes?: string | null;
  notesButtonLabel?: string;
}

// Locked: shows the category label by default, "unlocked on attempt N" on
// hover. Unlocked: shows the revealed value by default, the category label
// on hover. Both states use the same crossfade so the interaction feels
// consistent either way.
export function HintCard({ label, value, unlockedAtLabel, notes, notesButtonLabel }: HintCardProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const unlocked = value !== null;
  const front = unlocked ? value : label;
  const back = unlocked ? label : unlockedAtLabel;

  return (
    <div
      className={`group relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border px-3 py-2.5 text-center transition-colors ${
        unlocked ? "border-foreground/15 bg-foreground/[0.04]" : "border-dashed border-foreground/15"
      }`}
    >
      <div className="relative h-4 w-full">
        <span
          className={`absolute inset-0 flex items-center justify-center truncate text-xs font-medium transition-opacity duration-200 group-hover:opacity-0 ${
            unlocked ? "text-foreground" : "text-foreground/45"
          }`}
        >
          {front}
        </span>
        <span className="absolute inset-0 flex items-center justify-center truncate text-xs font-medium text-foreground/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {back}
        </span>
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
            onMouseEnter={() => setNotesOpen(true)}
            onMouseLeave={() => setNotesOpen(false)}
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground/15 text-[10px] font-semibold text-foreground/80 hover:bg-foreground/25"
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
