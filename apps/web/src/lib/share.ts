import type { GuessHistoryEntry, GuessProximity } from "./gameStorage";
import { SITE_URL } from "./site";
import type { ComparisonResult } from "./types";

const ARROW: Record<ComparisonResult, string> = {
  Bigger: "⬆️",
  Smaller: "⬇️",
  Approximate: "↔️",
};

// Up to this border-to-border distance a miss counts as "close" (🟧).
export const CLOSE_KM = 1000;

// How close a wrong guess landed on the map, as one coloured square:
// 🟨 shares territory with the answer (or one is inside the other),
// 🟧 apart but close, 🟥 far, ⬜ no map to compare (either side).
export function proximitySquare(p: GuessProximity | null | undefined): string {
  if (!p) return "⬜";
  if (p.shared > 0 || (p.answerCovered ?? 0) > 0 || (p.guessCovered ?? 0) > 0) return "🟨";
  return (p.distanceKm ?? Infinity) < CLOSE_KM ? "🟧" : "🟥";
}

// The link back to the game, in the sharer's language: the preview card
// WhatsApp/X/Discord draw from it is then in that language too. English
// is the default locale and stays on the bare address.
export function shareUrl(locale?: string): string {
  return !locale || locale === "en" ? SITE_URL : `${SITE_URL}/${locale}`;
}

export interface ShareOptions {
  // Replaces the daily "Imperatle #N": a past game is shared under its own,
  // translated title, so it can't pass for that day's daily result.
  title?: string;
  locale?: string;
}

// Spoiler-free result for social media: one line per guess (a square for
// how close it was on the map, plus the area 🗺️ and era ⏳ arrows; 🟩 for
// the right one), and the link back to the game -- that link is the whole
// point, it's how the game spreads.
export function buildShareText(
  guesses: GuessHistoryEntry[],
  challengeNumber: number,
  attemptsAllowed: number,
  { title = `Imperatle #${challengeNumber}`, locale }: ShareOptions = {},
): string {
  const won = guesses.some((g) => g.correct);
  const score = won ? `${guesses.length}/${attemptsAllowed}` : `X/${attemptsAllowed}`;
  const lines = guesses.map((g) => {
    if (g.correct) return "🟩";
    const area = g.areaComparison ? ` 🗺️${ARROW[g.areaComparison]}` : "";
    const era = g.eraComparison ? ` ⏳${ARROW[g.eraComparison]}` : "";
    return `${proximitySquare(g.proximity)}${area}${era}`;
  });
  return [`${title} 🏛️ ${score}`, "", ...lines, "", shareUrl(locale)].join("\n");
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
