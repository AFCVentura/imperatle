"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface MarqueeTextProps {
  children: ReactNode;
  className?: string;
}

// Pixels per second while the text is sliding.
const SCROLL_SPEED = 30;
// Share of the cycle spent moving; the rest is the pause at each end (see
// the `marquee` keyframes in globals.css).
const MOVING_SHARE = 0.7;

// Single-line text that, when it doesn't fit its box, slides back and forth
// so the whole thing can be read instead of being cut off with an ellipsis.
// Fits -> renders as plain static text.
export function MarqueeText({ children, className = "" }: MarqueeTextProps) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => setOverflow(Math.max(0, Math.ceil(inner.scrollWidth - outer.clientWidth)));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [children]);

  const scrolling = overflow > 0;
  const style: CSSProperties | undefined = scrolling
    ? ({
        "--marquee-distance": `-${overflow}px`,
        "--marquee-duration": `${Math.max(3, (2 * overflow) / SCROLL_SPEED / MOVING_SHARE)}s`,
      } as CSSProperties)
    : undefined;

  return (
    <span
      ref={outerRef}
      // Overflowing text starts from the left edge, otherwise the centered
      // layout would hide its beginning before the animation starts.
      style={scrolling ? { textAlign: "left" } : undefined}
      className={`block min-w-0 overflow-hidden whitespace-nowrap ${className}`}
    >
      <span
        ref={innerRef}
        style={style}
        className={`inline-block ${scrolling ? "animate-marquee hover:[animation-play-state:paused]" : ""}`}
      >
        {children}
      </span>
    </span>
  );
}
