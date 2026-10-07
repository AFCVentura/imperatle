import type { GuessHistoryEntry } from "./gameStorage";
import type { ComparisonResult } from "./types";

const ARROW: Record<ComparisonResult, string> = {
  Bigger: "⬆️",
  Smaller: "⬇️",
  Approximate: "↔️",
};

// Spoiler-free result for social media: one line per guess (✅/❌ plus the
// area 🗺️ and duration ⏳ arrows), and the link back to the game -- that
// link is the whole point, it's how the game spreads.
export function buildShareText(guesses: GuessHistoryEntry[], challengeNumber: number, attemptsAllowed: number): string {
  const won = guesses.some((g) => g.correct);
  const score = won ? `${guesses.length}/${attemptsAllowed}` : `X/${attemptsAllowed}`;
  const lines = guesses.map((g) => {
    if (g.correct) return "✅";
    const area = g.areaComparison ? ` 🗺️${ARROW[g.areaComparison]}` : "";
    const duration = g.durationComparison ? ` ⏳${ARROW[g.durationComparison]}` : "";
    return `❌${area}${duration}`;
  });
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imperatle.com";
  return [`Imperatle #${challengeNumber} 🏛️ ${score}`, "", ...lines, "", url].join("\n");
}

// Phones get the native share sheet (straight to WhatsApp, X, etc.);
// everything else copies to the clipboard.
export async function shareResult(text: string): Promise<"shared" | "copied" | "failed"> {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      // The user closed the share sheet -- not an error worth reporting.
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
