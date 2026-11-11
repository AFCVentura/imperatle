import { describe, expect, it } from "vitest";
import type { GuessHistoryEntry } from "./gameStorage";
import en from "../messages/en.json";
import pt from "../messages/pt.json";
import { buildShareText } from "./share";

const wrong = (area: GuessHistoryEntry["areaComparison"], era: GuessHistoryEntry["areaComparison"]): GuessHistoryEntry => ({
  empireId: 1,
  nameEn: "Some Empire",
  namePt: "Algum Império",
  correct: false,
  areaComparison: area,
  eraComparison: era,
});

const right: GuessHistoryEntry = { ...wrong(null, null), correct: true };

describe("buildShareText", () => {
  it("shows the score, one line per guess and the link", () => {
    const text = buildShareText([wrong("Bigger", "Smaller"), right], 12, 7);

    expect(text).toBe(["Imperatle #12 🏛️ 2/7", "", "❌ 🗺️⬆️ ⏳⬇️", "✅", "", "https://imperatle.com"].join("\n"));
  });

  it("uses X for a lost game", () => {
    const text = buildShareText(Array.from({ length: 7 }, () => wrong("Approximate", "Approximate")), 3, 7);

    expect(text.split("\n")[0]).toBe("Imperatle #3 🏛️ X/7");
  });

  it("shares a past game under its own title, never as that day's daily result", () => {
    const guesses = [wrong("Bigger", "Smaller"), right];
    const text = buildShareText(guesses, 12, 7, "Arquivo #12");

    expect(text.split("\n")[0]).toBe("Arquivo #12 🏛️ 2/7");
    expect(text).not.toContain("Imperatle #");
    // Everything but the title is the daily share's.
    expect(text.split("\n").slice(1)).toEqual(buildShareText(guesses, 12, 7).split("\n").slice(1));
  });

  it("takes the archive title from Share.archiveTitle in both languages", () => {
    for (const [messages, expected] of [
      [pt, "Arquivo #12"],
      [en, "Archive #12"],
    ] as const) {
      const title = messages.Share.archiveTitle.replace("{number}", "12");
      expect(buildShareText([right], 12, 7, title).split("\n")[0]).toBe(`${expected} 🏛️ 1/7`);
      // A past game is not a Practice round: the share must not borrow that mode's name.
      expect(title).not.toContain(messages.Practice.title);
    }
  });

  it("never names the empires (no spoilers)", () => {
    const text = buildShareText([wrong("Bigger", "Bigger"), right], 1, 7);

    expect(text).not.toContain("Empire");
    expect(text).not.toContain("Império");
  });
});
