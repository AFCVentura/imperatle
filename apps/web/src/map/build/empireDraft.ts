import { CONTINENTS, type Continent } from "./continents.ts";

// An empire as the generator builds it: exactly the shape of a
// Content/empires/<slug>.json file (see apps/api/Content/empire.schema.json).
// Today it's saved as that file; the public generator will store the same
// draft in the database for review.

export const YEAR_PRECISIONS = ["Exact", "Approximate", "Century"] as const;
export const AREA_PRECISIONS = ["Exact", "Approximate"] as const;
export const MAP_ACCURACIES = ["Precise", "Approximate", "Speculative"] as const;

export type Text = { en: string; pt: string };

// A Cliopatria polity at a year, or today's territory (Natural Earth's
// 3-letter code) for land the dataset misses.
export type MapPart = { polity: string; year: number } | { country: string };
export const isCountryPart = (p: MapPart): p is { country: string } => "country" in p;
export type Year = { year: number; precision: (typeof YEAR_PRECISIONS)[number] };

export type EmpireDraft = {
  slug: string;
  name: Text;
  peak: Year;
  start: Year;
  end: Year;
  durationNotes?: Text;
  area: { km2: number; precision: (typeof AREA_PRECISIONS)[number] };
  mapAccuracy: (typeof MAP_ACCURACIES)[number];
  continents: Continent[];
  primaryContinent: Continent;
  capital: Text;
  language: Text;
  religion: Text;
  religionNotes?: Text;
  curiosities: Text[];
  wikipedia?: Text;
  map: { parts: MapPart[] };
};

export const CURIOSITY_COUNT = 3;

// An optional text with both languages empty counts as not filled in.
export const isBlank = (t?: Text) => !t || (!t.en.trim() && !t.pt.trim());

// The rules EmpireContentLoader.Validate (API) applies on startup, checked
// while the form is filled in. Keep both in sync.
export function validateDraft(draft: EmpireDraft, others: { slug: string; name: Text }[] = []): string[] {
  const errors: string[] = [];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) errors.push("slug: só letras minúsculas, números e hífens (ex.: mongol-empire)");
  if (others.some((o) => o.slug === draft.slug)) errors.push(`slug: já existe um império "${draft.slug}"`);

  checkText(errors, "nome", draft.name);
  checkText(errors, "capital", draft.capital);
  checkText(errors, "língua", draft.language);
  checkText(errors, "religião", draft.religion);
  if (!isBlank(draft.durationNotes)) checkText(errors, "nota da duração", draft.durationNotes!);
  if (!isBlank(draft.religionNotes)) checkText(errors, "nota da religião", draft.religionNotes!);

  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  for (const o of others) {
    if (same(o.name.en, draft.name.en)) errors.push(`nome (en): "${draft.name.en}" já é usado por ${o.slug}`);
    if (same(o.name.pt, draft.name.pt)) errors.push(`nome (pt): "${draft.name.pt}" já é usado por ${o.slug}`);
  }

  for (const [label, y] of [["auge", draft.peak], ["início", draft.start], ["fim", draft.end]] as const) {
    if (!Number.isInteger(y.year) || y.year === 0) errors.push(`ano de ${label}: não existe ano 0 (use -1 para 1 a.C., 1 para 1 d.C.)`);
  }
  if (draft.start.year > draft.end.year) errors.push("o início não pode ser depois do fim");
  if (draft.peak.year < draft.start.year || draft.peak.year > draft.end.year) errors.push("o ano de auge tem que estar entre o início e o fim");

  if (!(draft.area.km2 > 0)) errors.push("a área tem que ser positiva");

  if (draft.continents.length === 0) errors.push("marque pelo menos um continente");
  if (new Set(draft.continents).size !== draft.continents.length) errors.push("continentes repetidos");
  if (draft.continents.some((c) => !CONTINENTS.includes(c))) errors.push("continente desconhecido");
  if (!draft.continents.includes(draft.primaryContinent)) errors.push("o continente principal tem que estar entre os marcados");

  if (draft.curiosities.length !== CURIOSITY_COUNT) errors.push(`são exatamente ${CURIOSITY_COUNT} dicas`);
  draft.curiosities.forEach((c, i) => checkText(errors, `dica ${i + 1}`, c));

  if (!isBlank(draft.wikipedia)) {
    for (const lang of ["en", "pt"] as const) {
      const prefix = `https://${lang}.wikipedia.org/wiki/`;
      const url = draft.wikipedia![lang];
      if (!url.startsWith(prefix) || url.length <= prefix.length) errors.push(`wikipedia (${lang}): tem que ser um link de ${lang}.wikipedia.org`);
    }
  }

  if (!draft.map.parts.some((p) => !isCountryPart(p))) errors.push("o mapa precisa de pelo menos uma entidade do Cliopatria");
  for (const p of draft.map.parts) {
    if (isCountryPart(p) && !/^[A-Z]{3}$/.test(p.country)) errors.push(`território "${p.country}": código de 3 letras maiúsculas`);
  }

  return errors;
}

function checkText(errors: string[], label: string, text: Text) {
  for (const lang of ["en", "pt"] as const) {
    const value = text[lang] ?? "";
    if (!value.trim()) errors.push(`${label} (${lang}): vazio`);
    // House style: no em dashes in player-facing text.
    else if (value.includes("—") || value.includes("--")) errors.push(`${label} (${lang}): sem travessão nem "--"; use vírgula, dois-pontos, ponto ou parênteses`);
  }
}

// Optional texts are left out of the file when both languages are empty.
export function toContentJson(draft: EmpireDraft): string {
  const blank = isBlank;
  const { durationNotes, religionNotes, wikipedia, ...rest } = draft;
  const ordered = {
    $schema: "../empire.schema.json",
    slug: rest.slug,
    name: rest.name,
    peak: rest.peak,
    start: rest.start,
    end: rest.end,
    ...(blank(durationNotes) ? {} : { durationNotes }),
    area: rest.area,
    mapAccuracy: rest.mapAccuracy,
    continents: rest.continents,
    primaryContinent: rest.primaryContinent,
    capital: rest.capital,
    language: rest.language,
    religion: rest.religion,
    ...(blank(religionNotes) ? {} : { religionNotes }),
    curiosities: rest.curiosities,
    ...(blank(wikipedia) ? {} : { wikipedia }),
    map: rest.map,
  };
  return JSON.stringify(ordered, null, 2) + "\n";
}
