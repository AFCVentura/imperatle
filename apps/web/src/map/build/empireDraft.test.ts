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
    [{ map: { parts: [{ country: "PYF" }] } }, "entidade do Cliopatria"],
    [{ map: { parts: [{ polity: "Test Polity", year: 100 }, { country: "pyf" }] } }, "3 letras"],
  ] as [Partial<EmpireDraft>, string][])("reports %o", (change, message) => {
    expect(validateDraft({ ...valid(), ...change }).some((e) => e.includes(message))).toBe(true);
  });

  it("accepts today's territories next to a polity", () => {
    expect(validateDraft({ ...valid(), map: { parts: [{ polity: "Test Polity", year: 100 }, { country: "PYF" }] } })).toEqual([]);
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

  it("writes aliases, the summary and clue explanations only when filled in", () => {
    const draft: EmpireDraft = {
      ...valid(),
      aliases: [" Mughal ", "", "Mugal"],
      summary: { en: "What it was.", pt: "O que foi." },
      curiosities: [
        { en: "One.", pt: "Um.", details: { en: "More.", pt: "Mais." } },
        { en: "Two.", pt: "Dois.", details: { en: "", pt: "" } },
        { en: "Three.", pt: "Três." },
      ],
    };
    const json = JSON.parse(toContentJson(draft));
    expect(json.aliases).toEqual(["Mughal", "Mugal"]);
    expect(json.summary).toEqual({ en: "What it was.", pt: "O que foi." });
    expect(json.curiosities[0].details).toEqual({ en: "More.", pt: "Mais." });
    expect(json.curiosities[1]).toEqual({ en: "Two.", pt: "Dois." });
    expect(Object.keys(json).slice(-3)).toEqual(["aliases", "summary", "map"]);
  });

  it("flags a repeated alias", () => {
    expect(validateDraft({ ...valid(), aliases: ["Mughal", "mughal"] })).toContainEqual(expect.stringContaining("repetido"));
  });
});
