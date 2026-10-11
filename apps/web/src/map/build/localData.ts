import { readFileSync } from "node:fs";
import path from "node:path";
import type { MultiPolygon, Position } from "geojson";
import { feature, merge } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import polygonClipping, { type Geom } from "polygon-clipping";
import { continentLand, type ContinentLand, type CountryLand } from "./continents.ts";
import type { Box } from "./empireDraft.ts";
import { drawnPolygons, polygonsOf, type Rings } from "./shape.ts";

// The empire generator's data, read from the local Cliopatria index
// (scripts/maps/index-cliopatria.mjs) and the game's world map. Server side
// only, development only; the public generator will read the same data from
// Postgres/PostGIS behind the same endpoints.

export type PolitySummary = {
  id: string;
  name: string;
  wikipedia: string | null;
  wikidata: string | null;
  from: number;
  to: number;
  peakAreaKm2: number;
  peakYear: number;
};

export type Polity = PolitySummary & { ranges: { from: number; to: number; areaKm2: number }[] };

type IndexEntry = PolitySummary & { ranges: [number, number, number][] };
type PolityRecord = { from: number; to: number; areaKm2: number; geometry: MultiPolygon };

const ROOT = process.cwd();
const CLIOPATRIA = path.join(ROOT, "dev-data", "cliopatria");

export class MissingIndexError extends Error {
  constructor() {
    super("Cliopatria index not found: run scripts/maps/index-cliopatria.mjs (see apps/api/Content/README.md)");
  }
}

let index: IndexEntry[] | null = null;
function loadIndex(): IndexEntry[] {
  if (!index) {
    try {
      index = JSON.parse(readFileSync(path.join(CLIOPATRIA, "index.json"), "utf8")) as IndexEntry[];
    } catch {
      throw new MissingIndexError();
    }
  }
  return index;
}

// Case and accent insensitive, every word must match; biggest polities first,
// names that start with the query ahead of the rest.
const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function searchPolities(query: string, limit = 40): PolitySummary[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return loadIndex()
    .map((p) => ({ p, name: normalize(p.name) }))
    .filter(({ name }) => words.every((w) => name.includes(w)))
    .sort((a, b) => Number(b.name.startsWith(words[0])) - Number(a.name.startsWith(words[0])) || b.p.peakAreaKm2 - a.p.peakAreaKm2)
    .slice(0, limit)
    .map(({ p }) => summary(p));
}

const summary = (p: IndexEntry): PolitySummary => ({
  id: p.id,
  name: p.name,
  wikipedia: p.wikipedia,
  wikidata: p.wikidata,
  from: p.from,
  to: p.to,
  peakAreaKm2: p.peakAreaKm2,
  peakYear: p.peakYear,
});

export function getPolity(id: string): Polity | null {
  const p = loadIndex().find((e) => e.id === id);
  if (!p) return null;
  return { ...summary(p), ranges: p.ranges.map(([from, to, areaKm2]) => ({ from, to, areaKm2 })) };
}

export function findPolityByName(name: string): Polity | null {
  const p = loadIndex().find((e) => e.name === name);
  return p ? getPolity(p.id) : null;
}

// A part as the endpoints take it: a polity (by index id) at a year,
// today's territory by its Natural Earth code, or an area drawn by hand.
export type PartRef = { id: string; year: number } | { country: string; box?: Box } | { draw: "add" | "remove"; ring: Position[] };

// The polygons of each part (areas drawn to remove apart); throws if a polity
// has no record covering its year or a territory doesn't exist.
export function partPolygons(parts: PartRef[]): { polygons: Rings[][]; removed: Rings[][]; datasetAreaKm2: number } {
  let datasetAreaKm2 = 0;
  const removed = parts.flatMap((part) => ("draw" in part && part.draw === "remove" ? [drawnPolygons(part.ring)] : []));
  const polygons = parts.filter((part) => !("draw" in part && part.draw === "remove")).map((part) => {
    if ("draw" in part) return drawnPolygons(part.ring);
    if ("country" in part) {
      const country = worldLand().countries.get(part.country);
      if (!country) throw new Error(`no territory ${part.country} in the world map`);
      if (!part.box) return polygonsOf(country);
      const [w, s, e, n] = part.box;
      const box = [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
      return polygonClipping.intersection(polygonsOf(country) as unknown as Geom, [box] as unknown as Geom) as unknown as Rings[];
    }
    const { id, year } = part;
    if (!/^p\d{4}$/.test(id)) throw new Error(`unknown polity ${id}`);
    const records = JSON.parse(readFileSync(path.join(CLIOPATRIA, "polities", `${id}.json`), "utf8")) as PolityRecord[];
    const hits = records.filter((r) => r.from <= year && year <= r.to);
    if (hits.length === 0) throw new Error(`${getPolity(id)?.name ?? id} has no record for ${year}`);
    datasetAreaKm2 += hits.reduce((sum, r) => sum + r.areaKm2, 0);
    return hits.flatMap((r) => polygonsOf(r.geometry));
  });
  return { polygons, removed, datasetAreaKm2 };
}

type WorldTopology = Topology<{ countries: GeometryCollection<{ continent: string }> }>;

let world: { land: Rings[]; continents: ContinentLand; countries: Map<string, MultiPolygon> } | null = null;

// The game's land (for clipping) and each continent's land, built once.
export function worldLand() {
  if (!world) {
    const topo = JSON.parse(readFileSync(path.join(ROOT, "public", "geo", "world.json"), "utf8")) as WorldTopology;
    const obj = topo.objects.countries;
    const countries = (feature(topo, obj) as unknown as { features: { id: string; properties: { continent: string }; geometry: MultiPolygon }[] }).features
      .filter((f) => f.geometry)
      .map((f): CountryLand => ({ id: String(f.id), continent: f.properties.continent, geometry: f.geometry }));
    world = {
      land: polygonsOf(merge(topo, obj.geometries as never)),
      continents: continentLand(countries),
      countries: new Map(countries.map((c) => [c.id, c.geometry])),
    };
  }
  return world;
}
