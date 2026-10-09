"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MarqueeText } from "./MarqueeText";
import { useTooltip } from "@/lib/useTooltip";

// Hover delay before the notes open; a bit shorter than the clue tooltip's.
const NOTES_OPEN_DELAY_MS = 300;

interface HintCardProps {
  label: string;
  value: ReactNode | null;
  unlockedAtLabel: string;
  // What this kind of clue means, shown in a tooltip.
  description: string;
  notes?: string | null;
  notesButtonLabel?: string;
  className?: string;
}

// A flat cell inside an attempt's pill (the pill draws the border and the
// dividers). Locked: shows the category label by default, "unlocked on attempt N" on
// hover. Unlocked: shows the revealed value by default, the category label
// on hover. Both states use the same crossfade so the interaction feels
// consistent either way. Touch screens have no hover, so a tap flips the
// card instead (Tailwind's hover: only applies on devices that can hover).
// On top of the flip, a tooltip explains what the clue means: after a short
// hover delay, or on click/tap.
export function HintCard({
  label,
  value,
  unlockedAtLabel,
  description,
  notes,
  notesButtonLabel,
  className = "",
}: HintCardProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  // Pointer over the "?": the notes are about to open (hover delay).
  const [notesHovered, setNotesHovered] = useState(false);
  const notesTimerRef = useRef<number | undefined>(undefined);
  const [flipped, setFlipped] = useState(false);
  const { anchorProps, toggle, hide: hideTooltip, schedule: scheduleTooltip, tooltip } = useTooltip(
    <>
      <span className="mb-0.5 block font-display font-semibold">{label}</span>
      {description}
    </>,
  );
  const unlocked = value !== null;
  const front = unlocked ? value : label;
  const back = unlocked ? label : unlockedAtLabel;
  const hasNotes = unlocked && !!notes;
  // While the notes are open they own the card: no flip to the label and no
  // explanatory tooltip on top of them.
  const showBack = flipped && !notesOpen;
  const hoverFlip = !notesOpen && !notesHovered;

  useEffect(() => () => window.clearTimeout(notesTimerRef.current), []);

  function openNotes() {
    window.clearTimeout(notesTimerRef.current);
    hideTooltip();
    setNotesOpen(true);
  }

  function closeNotes() {
    window.clearTimeout(notesTimerRef.current);
    setNotesOpen(false);
  }

  return (
    <div
      {...anchorProps}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      // Mouse users already get the flip on hover; flipping on click too
      // would leave the card stuck on its back after the pointer leaves, so
      // a click only toggles the tooltip.
      onPointerUp={(e) => {
        if (e.pointerType !== "mouse") setFlipped((f) => !f);
        toggle();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
          toggle();
        }
      }}
      className={`group relative flex min-w-0 flex-auto cursor-default select-none flex-col items-center justify-center px-3 py-1.5 text-center transition-colors ${className}`}
    >
      {/* Front and back share one grid cell instead of being absolutely
          positioned, so the card's natural width is the wider of the two --
          that's what lets each card grow to fit its text. */}
      {/* With notes, the text keeps clear of the "?" in the corner instead
          of scrolling under it. */}
      <div className={`grid w-full grid-cols-[minmax(0,1fr)] leading-4 ${hasNotes ? "pr-3" : ""}`}>
        <MarqueeText
          className={`[grid-area:1/1] text-xs font-medium transition-opacity duration-200 ${
            hoverFlip ? "group-hover:opacity-0" : ""
          } ${showBack ? "opacity-0" : ""} ${unlocked ? "text-foreground" : "text-muted/70"}`}
        >
          {front}
        </MarqueeText>
        <MarqueeText
          className={`[grid-area:1/1] text-xs font-medium text-muted transition-opacity duration-200 ${
            hoverFlip ? "group-hover:opacity-100" : ""
          } ${showBack ? "opacity-100" : "opacity-0"}`}
        >
          {back}
        </MarqueeText>
      </div>

      {hasNotes && (
        <>
          <button
            type="button"
            aria-label={notesButtonLabel}
            onClick={(e) => {
              e.stopPropagation();
              if (notesOpen) closeNotes();
              else openNotes();
            }}
            // Keep a tap on "?" from also flipping the card.
            onPointerUp={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              hideTooltip();
              setNotesHovered(true);
              window.clearTimeout(notesTimerRef.current);
              notesTimerRef.current = window.setTimeout(openNotes, NOTES_OPEN_DELAY_MS);
            }}
            onMouseLeave={(e) => {
              setNotesHovered(false);
              closeNotes();
              // Back onto the rest of the card: its tooltip comes back after
              // the usual delay, as if the pointer had just entered it.
              if (e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) scheduleTooltip();
            }}
            className={`absolute flex h-4 w-4 right-1 top-1 items-center justify-center rounded-full bg-muted/20 text-[10px] font-semibold text-foreground hover:bg-muted/35`}
          >
            ?
          </button>
          {notesOpen && (
            <div className="absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-line bg-background p-2.5 text-left text-xs leading-snug text-foreground shadow-lg">
              {notes}
            </div>
          )}
        </>
      )}
      {tooltip}
    </div>
  );
}
