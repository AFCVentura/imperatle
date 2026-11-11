import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import es from "../messages/es.json";
import pt from "../messages/pt.json";
import { RELEASES } from "./changelog";
import { LEGAL } from "./legal";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

// Every leaf key as a dotted path ("Game.directions.N").
function keyPaths(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

function leaf(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], messages);
}

// The ICU arguments a message uses: {year}, {count, plural, ...}.
function placeholders(text: string): string {
  return [...text.matchAll(/\{(\w+)\s*[,}]/g)].map((m) => m[1]).sort().join();
}

const spanishLegalAndChangelog = [
  ...Object.values(LEGAL).flatMap((doc) => strings(doc.es)),
  ...RELEASES.flatMap((release) => [...release.empires, ...release.features, ...release.fixes].map((item) => item.es)),
];

describe("visible text", () => {
  it("never uses the long dash", () => {
    for (const text of [...strings(en), ...strings(pt), ...strings(es)]) expect(text).not.toContain("—");
  });

  it("never uses the long dash in the Spanish legal texts and changelog", () => {
    expect(spanishLegalAndChangelog.length).toBeGreaterThan(0);
    expect(spanishLegalAndChangelog.filter((text) => text.includes("—") || text.includes("--"))).toEqual([]);
  });

  it("has exactly the same keys in Spanish as in English", () => {
    const enKeys = new Set(keyPaths(en));
    const esKeys = new Set(keyPaths(es));
    const missing = [...enKeys].filter((key) => !esKeys.has(key));
    const extra = [...esKeys].filter((key) => !enKeys.has(key));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it("keeps every placeholder in Spanish", () => {
    const mismatched = keyPaths(en).filter((path) => {
      const source = leaf(en, path);
      const translated = leaf(es, path);
      return typeof source === "string" && typeof translated === "string" && placeholders(source) !== placeholders(translated);
    });
    expect(mismatched).toEqual([]);
  });

  // The menu and the page call it "Treino"; the support dialog and the terms
  // used to say "modo prática" for the same perk.
  it("names practice mode the same way everywhere in Portuguese", () => {
    const all = [...strings(pt), ...Object.values(LEGAL).flatMap((doc) => strings(doc.pt))];
    expect(all.filter((text) => /pr[aá]tica/i.test(text) && /modo/i.test(text))).toEqual([]);
    expect(pt.Support.perks.practice.title).toBe("Modo treino");
  });
});
