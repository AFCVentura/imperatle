import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import pt from "../messages/pt.json";
import { LEGAL } from "./legal";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("visible text", () => {
  it("never uses the long dash", () => {
    for (const text of [...strings(en), ...strings(pt)]) expect(text).not.toContain("—");
  });

  // The menu and the page call it "Treino"; the support dialog and the terms
  // used to say "modo prática" for the same perk.
  it("names practice mode the same way everywhere in Portuguese", () => {
    const all = [...strings(pt), ...strings(LEGAL)];
    expect(all.filter((text) => /pr[aá]tica/i.test(text) && /modo/i.test(text))).toEqual([]);
    expect(pt.Support.perks.practice.title).toBe("Modo treino");
  });
});
