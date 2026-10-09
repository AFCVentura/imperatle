"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Long enough that sweeping the mouse across the board doesn't flash
// tooltips, short enough that resting on something feels responsive.
const OPEN_DELAY_MS = 450;
const MAX_WIDTH = 256;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

interface Position {
  // Horizontal centre of the anchor; the tooltip is centred on it once its
  // own width (as wide as the text, up to maxWidth) is known.
  center: number;
  maxWidth: number;
  top?: number;
  bottom?: number;
}

// Explanatory tooltip for an element: opens after a short hover delay (mouse)
// or on click/tap, which also pins it until the next click, a click
// elsewhere, Escape or scrolling. Rendered in a portal with fixed
// positioning, clamped to the viewport, so pills with overflow or the screen
// edge never cut it off. `container` replaces document.body when the anchor
// sits in a fullscreen element, which is all the browser shows then.
export function useTooltip(content: ReactNode, container?: Element | null) {
  const id = useId();
  const anchorRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState<Position | null>(null);
  const [pinned, setPinned] = useState(false);

  const show = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const maxWidth = Math.min(MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const center = rect.left + rect.width / 2;
    // Below by default; above when the element sits in the bottom third
    // (e.g. near the pinned guess input on phones).
    const placeAbove = rect.bottom > window.innerHeight * (2 / 3);
    setPosition(
      placeAbove
        ? { center, maxWidth, bottom: window.innerHeight - rect.top + GAP }
        : { center, maxWidth, top: rect.bottom + GAP },
    );
  }, []);

  const hide = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setPosition(null);
    setPinned(false);
  }, []);

  // Opens after the hover delay, as if the pointer had just entered.
  const schedule = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(show, OPEN_DELAY_MS);
  }, [show]);

  const toggle = useCallback(() => {
    window.clearTimeout(timerRef.current);
    if (pinned) {
      hide();
    } else {
      show();
      setPinned(true);
    }
  }, [pinned, show, hide]);

  useEffect(() => {
    if (!position) return;
    function handlePointerDown(e: PointerEvent) {
      if (!anchorRef.current?.contains(e.target as Node)) hide();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") hide();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, [position, hide]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const anchorProps = {
    ref: (el: HTMLElement | null) => {
      anchorRef.current = el;
    },
    "aria-describedby": position ? id : undefined,
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(show, OPEN_DELAY_MS);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      window.clearTimeout(timerRef.current);
      if (!pinned) setPosition(null);
    },
  };

  const tooltip =
    position &&
    createPortal(
      <div
        id={id}
        role="tooltip"
        // Centred on the anchor and clamped to the viewport, measured before
        // the browser paints it.
        ref={(el) => {
          if (!el) return;
          const width = el.offsetWidth;
          const left = Math.min(Math.max(position.center - width / 2, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);
          el.style.left = `${left}px`;
        }}
        style={{ top: position.top, bottom: position.bottom, maxWidth: position.maxWidth, left: 0 }}
        className="pointer-events-none fixed z-50 w-max select-none rounded-lg border border-line bg-background px-3 py-2 text-left text-xs leading-snug text-foreground shadow-lg"
      >
        {content}
      </div>,
      container ?? document.body,
    );

  return { anchorProps, toggle, hide, schedule, tooltip };
}
