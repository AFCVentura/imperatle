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
  primaryContinents: ["Europe"],
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
    [{ primaryContinents: ["Africa"] }, "continentes principais têm"],
    [{ primaryContinents: [] }, "continentes principais"],
    [{ curiosities: [{ en: "One.", pt: "Um." }] }, "exatamente 3"],
    [{ religion: { en: "Old faith — new", pt: "Antiga" } }, "travessão"],
    [{ durationNotes: { en: "Only one phase", pt: "" } }, "nota da duração (pt): vazio"],
    [{ wikipedia: { en: "https://en.wikipedia.org/wiki/Rome", pt: "https://en.wikipedia.org/wiki/Rome" } }, "wikipedia (pt)"],
    [{ capital: { en: "Rome", pt: "Roma", es: "Roma — capital" } }, "capital (es): sem travessão"],
    [{ wikipedia: { en: "https://en.wikipedia.org/wiki/Rome", pt: "https://pt.wikipedia.org/wiki/Roma", es: "https://en.wikipedia.org/wiki/Rome" } }, "wikipedia (es)"],
    [{ map: { parts: [] } }, "entidade do Cliopatria"],
    [{ map: { parts: [{ country: "PYF" }] } }, "entidade do Cliopatria"],
    [{ map: { parts: [{ polity: "Test Polity", year: 100 }, { country: "pyf" }] } }, "3 letras"],
  ] as [Partial<EmpireDraft>, string][])("reports %o", (change, message) => {
    expect(validateDraft({ ...valid(), ...change }).some((e) => e.includes(message))).toBe(true);
  });

  it("accepts Spanish texts, and their absence", () => {
    const draft: EmpireDraft = {
      ...valid(),
      name: { en: "Test Empire", pt: "Império Teste", es: "Imperio de prueba" },
      curiosities: [{ en: "One.", pt: "Um.", es: "Uno.", details: { en: "More.", pt: "Mais.", es: "Más." } }, { en: "Two.", pt: "Dois.", es: "" }, { en: "Three.", pt: "Três." }],
      wikipedia: { en: "https://en.wikipedia.org/wiki/Rome", pt: "https://pt.wikipedia.org/wiki/Roma", es: "" },
    };
    expect(validateDraft(draft)).toEqual([]);
  });

  it("refuses a Spanish name another empire already uses", () => {
    const draft: EmpireDraft = { ...valid(), name: { en: "Test Empire", pt: "Império Teste", es: "Imperio de prueba" } };
    const errors = validateDraft(draft, [{ slug: "other", name: { en: "Other", pt: "Outro", es: "imperio de prueba" } }]);
    expect(errors.some((e) => e.includes("nome (es)"))).toBe(true);
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
      "primaryContinents", "capital", "language", "religion", "curiosities", "map",
    ]);
  });

  it("writes spread only when marked, right after the map's precision", () => {
    expect(JSON.parse(toContentJson(valid()))).not.toHaveProperty("spread");
    const keys = Object.keys(JSON.parse(toContentJson({ ...valid(), spread: true })));
    expect(keys[keys.indexOf("mapAccuracy") + 1]).toBe("spread");
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

  it("keeps Spanish texts in the order en, pt, es and never drops them", () => {
    const draft: EmpireDraft = {
      ...valid(),
      // Out of order, as the form may leave an edited text.
      name: { es: "Imperio de prueba", en: "Test Empire", pt: "Império Teste" },
      capital: { en: "Capital", pt: "Capital", es: "" },
      curiosities: [
        { details: { es: "Más.", pt: "Mais.", en: "More." }, es: "Uno.", pt: "Um.", en: "One." },
        { en: "Two.", pt: "Dois.", es: "Dos." },
        { en: "Three.", pt: "Três." },
      ],
      summary: { en: "", pt: "", es: "Solo en español." },
      wikipedia: { en: "https://en.wikipedia.org/wiki/Rome", pt: "https://pt.wikipedia.org/wiki/Roma", es: "https://es.wikipedia.org/wiki/Roma" },
    };
    const text = toContentJson(draft);
    const json = JSON.parse(text);
    expect(Object.keys(json.name)).toEqual(["en", "pt", "es"]);
    expect(json.name.es).toBe("Imperio de prueba");
    // An empty Spanish text is left out (the game falls back to English).
    expect(Object.keys(json.capital)).toEqual(["en", "pt"]);
    expect(Object.keys(json.curiosities[0])).toEqual(["en", "pt", "es", "details"]);
    expect(Object.keys(json.curiosities[0].details)).toEqual(["en", "pt", "es"]);
    expect(json.curiosities[1].es).toBe("Dos.");
    expect(json.summary).toEqual({ en: "", pt: "", es: "Solo en español." });
    expect(json.wikipedia.es).toBe("https://es.wikipedia.org/wiki/Roma");
    expect(text).toContain(`"name": {\n    "en": "Test Empire",\n    "pt": "Império Teste",\n    "es": "Imperio de prueba"\n  }`);
  });

  it("keeps a drawn ring on one line", () => {
    const draft: EmpireDraft = {
      ...valid(),
      name: { en: "Test Empire", pt: "Império Teste", es: "Imperio de prueba" },
      map: { parts: [{ polity: "Test Polity", year: 100 }, { draw: "add", ring: [[0, 0], [1, 0], [1, 1]] }] },
    };
    expect(toContentJson(draft)).toContain('"ring": [[0,0],[1,0],[1,1]]');
  });

  it("flags a repeated alias", () => {
    expect(validateDraft({ ...valid(), aliases: ["Mughal", "mughal"] })).toContainEqual(expect.stringContaining("repetido"));
  });
});
