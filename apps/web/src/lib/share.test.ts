import { describe, expect, it } from "vitest";
import type { GuessHistoryEntry } from "./gameStorage";
import { buildShareText } from "./share";

const wrong = (area: GuessHistoryEntry["areaComparison"], duration: GuessHistoryEntry["durationComparison"]): GuessHistoryEntry => ({
  empireId: 1,
  nameEn: "Some Empire",
  namePt: "Algum Império",
  correct: false,
  areaComparison: area,
  durationComparison: duration,
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

  it("never names the empires (no spoilers)", () => {
    const text = buildShareText([wrong("Bigger", "Bigger"), right], 1, 7);

    expect(text).not.toContain("Empire");
    expect(text).not.toContain("Império");
  });
});
