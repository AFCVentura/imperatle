import { describe, expect, it } from "vitest";
import { toContentJson, validateDraft, type EmpireDraft } from "./empireDraft";

const valid = (): EmpireDraft => ({
  slug: "test-empire",
  name: { en: "Test Empire", pt: "Império Teste" },
  peak: { year: 100, precision: "Exact" },
  start: { year: -50, precision: "Approximate" },
  end: { year: 300, precision: "Century" },
  durationNotes: { en: "", pt: "" },
  area: { km2: 1_000_000, precision: "Approximate" },
  mapAccuracy: "Approximate",
  continents: ["Europe", "Asia"],
  primaryContinent: "Europe",
  capital: { en: "Capital", pt: "Capital" },
  language: { en: "Language", pt: "Língua" },
  religion: { en: "Religion", pt: "Religião" },
  religionNotes: { en: "", pt: "" },
  curiosities: [{ en: "One.", pt: "Um." }, { en: "Two.", pt: "Dois." }, { en: "Three.", pt: "Três." }],
  wikipedia: { en: "", pt: "" },
  map: { parts: [{ polity: "Test Polity", year: 100 }] },
});

describe("validateDraft", () => {
  it("accepts a complete draft with the optional texts left empty", () => {
    expect(validateDraft(valid())).toEqual([]);
  });

  it.each([
    [{ slug: "Test_Empire" }, "slug"],
    [{ peak: { year: 0, precision: "Exact" } }, "ano 0"],
    [{ start: { year: 400, precision: "Exact" } }, "início não pode ser depois"],
    [{ peak: { year: 500, precision: "Exact" } }, "auge tem que estar entre"],
    [{ continents: [] }, "pelo menos um continente"],
    [{ primaryContinent: "Africa" }, "continente principal"],
    [{ curiosities: [{ en: "One.", pt: "Um." }] }, "exatamente 3"],
    [{ religion: { en: "Old faith — new", pt: "Antiga" } }, "travessão"],
    [{ durationNotes: { en: "Only one phase", pt: "" } }, "nota da duração (pt): vazio"],
    [{ wikipedia: { en: "https://en.wikipedia.org/wiki/Rome", pt: "https://en.wikipedia.org/wiki/Rome" } }, "wikipedia (pt)"],
    [{ map: { parts: [] } }, "entidade do Cliopatria"],
  ] as [Partial<EmpireDraft>, string][])("reports %o", (change, message) => {
    expect(validateDraft({ ...valid(), ...change }).some((e) => e.includes(message))).toBe(true);
  });

  it("refuses a slug or a name another empire already uses", () => {
    const errors = validateDraft(valid(), [{ slug: "test-empire", name: { en: "test empire", pt: "Outro" } }]);
    expect(errors.some((e) => e.includes("já existe"))).toBe(true);
    expect(errors.some((e) => e.includes("nome (en)"))).toBe(true);
  });
});

describe("toContentJson", () => {
  it("leaves blank optional texts out and keeps the content file's field order", () => {
    const json = JSON.parse(toContentJson(valid()));
    expect(Object.keys(json)).toEqual([
      "$schema", "slug", "name", "peak", "start", "end", "area", "mapAccuracy", "continents",
      "primaryContinent", "capital", "language", "religion", "curiosities", "map",
    ]);
  });
});
