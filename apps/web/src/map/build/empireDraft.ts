import { CONTINENTS, type Continent } from "./continents.ts";

// An empire as the generator builds it: exactly the shape of a
// Content/empires/<slug>.json file (see apps/api/Content/empire.schema.json).
// Today it's saved as that file; the public generator will store the same
// draft in the database for review.

export const YEAR_PRECISIONS = ["Exact", "Approximate", "Century"] as const;
export const AREA_PRECISIONS = ["Exact", "Approximate"] as const;
export const MAP_ACCURACIES = ["Precise", "Approximate", "Speculative"] as const;

// Spanish (es) is optional: left out, the game shows the English text.
export type Text = { en: string; pt: string; es?: string };

// The languages a text is written in, in the content files' key order.
export const TEXT_LANGS = ["en", "pt", "es"] as const;

// A Cliopatria polity at a year, today's territory (Natural Earth's 3-letter
// code) for land the dataset misses, or an area drawn by hand on the map to
// add or remove (a ring of [longitude, latitude] points).
export type Box = [number, number, number, number]; // west, south, east, north
export type DrawPart = { draw: "add" | "remove"; ring: [number, number][] };
export type MapPart = { polity: string; year: number } | { country: string; box?: Box } | DrawPart;
export const isCountryPart = (p: MapPart): p is { country: string; box?: Box } => "country" in p;
export const isDrawPart = (p: MapPart): p is DrawPart => "draw" in p;
export const isPolityPart = (p: MapPart): p is { polity: string; year: number } => "polity" in p;

// A ring drawn across the antimeridian keeps going past ±180° (179, 181...).
export const isValidRing = (ring: number[][]) =>
  ring.length >= 3 && ring.every((pt) => pt.length === 2 && pt[0] >= -360 && pt[0] <= 360 && pt[1] >= -90 && pt[1] <= 90);

export const isValidBox = (b: number[]) =>
  b.length === 4 && b.every(Number.isFinite) && b[0] >= -180 && b[2] <= 180 && b[0] < b[2] && b[1] >= -90 && b[3] <= 90 && b[1] < b[3];
export type Year = { year: number; precision: (typeof YEAR_PRECISIONS)[number] };

export type EmpireDraft = {
  slug: string;
  name: Text;
  peak: Year;
  start: Year;
  end: Year | null; // null = still exists (written as "end": null)
  durationNotes?: Text;
  area: { km2: number; precision: (typeof AREA_PRECISIONS)[number] };
  mapAccuracy: (typeof MAP_ACCURACIES)[number];
  // Territory spread over far-apart places (colonial empires): the game shows
  // "spread out" instead of a direction arrow. Written only when true.
  spread?: boolean;
  continents: Continent[];
  // One, or two when the territory was split about evenly between them.
  primaryContinents: Continent[];
  capital: Text;
  language: Text;
  religion: Text;
  religionNotes?: Text;
  curiosities: Curiosity[];
  wikipedia?: Text;
  // Other names the guess list also matches; never shown as the answer.
  aliases?: string[];
  // What the empire was, shown once the round is over.
  summary?: Text;
  map: { parts: MapPart[] };
};

// A clue, plus an optional explanation shown once the round is over.
export type Curiosity = Text & { details?: Text };

export const CURIOSITY_COUNT = 3;
export const MAX_PRIMARY_CONTINENTS = 2;

// An optional text with every language empty counts as not filled in.
export const isBlank = (t?: Text) => !t || (!t.en.trim() && !t.pt.trim() && !(t.es ?? "").trim());

// A text in the content files' key order (en, pt, es), without an empty
// Spanish text (it falls back to English). Never drops a filled-in one.
export function orderedText<T extends Text>(t: T): Text & Omit<T, keyof Text> {
  const { en, pt, es, ...rest } = t;
  return { en, pt, ...(es?.trim() ? { es } : {}), ...rest } as Text & Omit<T, keyof Text>;
}

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
    if (o.name.es?.trim() && draft.name.es?.trim() && same(o.name.es, draft.name.es))
      errors.push(`nome (es): "${draft.name.es}" já é usado por ${o.slug}`);
  }

  // An empire that still exists runs to this year.
  const lastYear = draft.end?.year ?? new Date().getFullYear();
  for (const [label, y] of [["auge", draft.peak], ["início", draft.start], ["fim", draft.end]] as const) {
    if (y && (!Number.isInteger(y.year) || y.year === 0)) errors.push(`ano de ${label}: não existe ano 0 (use -1 para 1 a.C., 1 para 1 d.C.)`);
  }
  if (draft.start.year > lastYear) errors.push(draft.end ? "o início não pode ser depois do fim" : "o início não pode estar no futuro");
  if (draft.peak.year < draft.start.year || draft.peak.year > lastYear) errors.push(`o ano de auge tem que estar entre o início e ${draft.end ? "o fim" : "este ano"}`);

  if (!(draft.area.km2 > 0)) errors.push("a área tem que ser positiva");

  if (draft.continents.length === 0) errors.push("marque pelo menos um continente");
  if (new Set(draft.continents).size !== draft.continents.length) errors.push("continentes repetidos");
  if (draft.continents.some((c) => !CONTINENTS.includes(c))) errors.push("continente desconhecido");
  if (draft.primaryContinents.length < 1 || draft.primaryContinents.length > MAX_PRIMARY_CONTINENTS)
    errors.push(`marque 1 ou ${MAX_PRIMARY_CONTINENTS} continentes principais`);
  if (!draft.primaryContinents.every((c) => draft.continents.includes(c))) errors.push("os continentes principais têm que estar entre os marcados");

  if (draft.curiosities.length !== CURIOSITY_COUNT) errors.push(`são exatamente ${CURIOSITY_COUNT} dicas`);
  draft.curiosities.forEach((c, i) => {
    checkText(errors, `dica ${i + 1}`, c);
    if (!isBlank(c.details)) checkText(errors, `explicação da dica ${i + 1}`, c.details!);
  });
  if (!isBlank(draft.summary)) checkText(errors, "resumo", draft.summary!);

  const aliases = cleanAliases(draft.aliases);
  const seen = new Set<string>();
  for (const alias of aliases) {
    const key = alias.toLowerCase();
    if (seen.has(key)) errors.push(`nomes alternativos: "${alias}" repetido`);
    seen.add(key);
  }

  if (!isBlank(draft.wikipedia)) {
    for (const lang of TEXT_LANGS) {
      const prefix = `https://${lang}.wikipedia.org/wiki/`;
      const url = draft.wikipedia![lang] ?? "";
      // Spanish is optional (falls back to the English article).
      if (lang === "es" && !url.trim()) continue;
      if (!url.startsWith(prefix) || url.length <= prefix.length) errors.push(`wikipedia (${lang}): tem que ser um link de ${lang}.wikipedia.org`);
    }
  }

  if (!draft.map.parts.some(isPolityPart)) errors.push("o mapa precisa de pelo menos uma entidade do Cliopatria");
  for (const p of draft.map.parts) {
    if (isDrawPart(p) && !isValidRing(p.ring)) errors.push("desenho: pelo menos 3 pontos, longitude entre -360 e 360, latitude entre -90 e 90");
    if (isCountryPart(p) && !/^[A-Z]{3}$/.test(p.country)) errors.push(`território "${p.country}": código de 3 letras maiúsculas`);
    if (isCountryPart(p) && p.box && !isValidBox(p.box)) errors.push(`recorte de ${p.country}: oeste < leste e sul < norte, em graus`);
  }

  return errors;
}

function checkText(errors: string[], label: string, text: Text) {
  for (const lang of TEXT_LANGS) {
    const value = text[lang] ?? "";
    // Spanish is optional: empty means "use the English text".
    if (lang === "es" && !value.trim()) continue;
    if (!value.trim()) errors.push(`${label} (${lang}): vazio`);
    // House style: no em dashes in player-facing text.
    else if (value.includes("—") || value.includes("--")) errors.push(`${label} (${lang}): sem travessão nem "--"; use vírgula, dois-pontos, ponto ou parênteses`);
  }
}

// Aliases as saved: trimmed, empty entries dropped.
export const cleanAliases = (aliases?: string[]) => (aliases ?? []).map((a) => a.trim()).filter(Boolean);

// Optional texts are left out of the file when every language is empty.
// Texts keep the key order en, pt, es (es only when filled in).
export function toContentJson(draft: EmpireDraft): string {
  const blank = isBlank;
  const text = orderedText;
  const durationNotes = draft.durationNotes && text(draft.durationNotes);
  const religionNotes = draft.religionNotes && text(draft.religionNotes);
  const wikipedia = draft.wikipedia && text(draft.wikipedia);
  const summary = draft.summary && text(draft.summary);
  const aliases = cleanAliases(draft.aliases);
  // A clue's explanation is left out when empty, like the other optional texts.
  const curiosities = draft.curiosities.map(({ details, ...clue }) => (blank(details) ? text(clue) : { ...text(clue), details: text(details!) }));
  const ordered = {
    $schema: "../empire.schema.json",
    slug: draft.slug,
    name: text(draft.name),
    peak: draft.peak,
    start: draft.start,
    end: draft.end,
    ...(blank(durationNotes) ? {} : { durationNotes }),
    area: draft.area,
    mapAccuracy: draft.mapAccuracy,
    ...(draft.spread ? { spread: true } : {}),
    continents: draft.continents,
    primaryContinents: draft.primaryContinents,
    capital: text(draft.capital),
    language: text(draft.language),
    religion: text(draft.religion),
    ...(blank(religionNotes) ? {} : { religionNotes }),
    curiosities,
    ...(blank(wikipedia) ? {} : { wikipedia }),
    ...(aliases.length === 0 ? {} : { aliases }),
    ...(blank(summary) ? {} : { summary }),
    map: draft.map,
  };
  // A drawn ring stays on one line, or each point would take four.
  const rings: string[] = [];
  const json = JSON.stringify(ordered, (key, value) => (key === "ring" ? `\u0000${rings.push(JSON.stringify(value)) - 1}` : value), 2);
  return json.replace(/"\\u0000(\d+)"/g, (_, i: string) => rings[Number(i)]) + "\n";
}
