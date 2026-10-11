import type { MultiPolygon } from "geojson";
import polygonClipping, { type Geom, type Polygon as ClipPolygon } from "polygon-clipping";
import { areaKm2, boxOf, polygonsOf, toStandardLongitudes, type Rings } from "./shape.ts";

// Which continents an empire's shape covers, and how much of it lies on each:
// the generator pre-fills the "continents" clue with this.

// The game's continents (Continent enum in the API).
export const CONTINENTS = ["Africa", "Asia", "Europe", "NorthAmerica", "SouthAmerica", "Oceania"] as const;
export type Continent = (typeof CONTINENTS)[number];

const FROM_NATURAL_EARTH: Record<string, Continent | undefined> = {
  Africa: "Africa",
  Asia: "Asia",
  Europe: "Europe",
  "North America": "NorthAmerica",
  "South America": "SouthAmerica",
  Oceania: "Oceania",
};

type Box = [number, number, number, number]; // west, south, east, north

// Natural Earth gives each country one continent, which misplaces the parts
// of a country that lie on another one (all of Russia as Europe, French
// Guiana as Europe). For the cases that matter to historical empires, these
// boxes move a country's land to another continent.
const SPLITS: Record<string, { box: Box; to: Continent }[]> = {
  RUS: [
    { box: [60, 0, 180, 90], to: "Asia" }, // east of the Urals
    { box: [-180, 0, -160, 90], to: "Asia" }, // Chukotka beyond the date line
  ],
  KAZ: [{ box: [-180, -90, 51.5, 90], to: "Europe" }], // west of the Ural river
  TUR: [{ box: [25, 40.3, 29.05, 42.2], to: "Europe" }], // Thrace
  EGY: [{ box: [32.35, 27.7, 35, 31.4], to: "Asia" }], // Sinai
  IDN: [{ box: [130.5, -12, 141.1, 1], to: "Oceania" }], // western New Guinea
  USA: [{ box: [-180, 15, -150, 30], to: "Oceania" }], // Hawaii
  FRA: [
    { box: [-55, 1, -51, 6], to: "SouthAmerica" }, // French Guiana
    { box: [-62, 14, -60.5, 16.6], to: "NorthAmerica" }, // Guadeloupe, Martinique
    { box: [44, -22, 56, -12], to: "Africa" }, // Réunion, Mayotte
  ],
};

const boxPolygon = ([w, s, e, n]: Box): Rings => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
const asGeom = (polygons: Rings[]) => polygons as unknown as ClipPolygon[] as Geom;

export type CountryLand = { id: string; continent: string; geometry: MultiPolygon };

export type ContinentLand = Record<Continent, Rings[]>;

// Land of each continent, built once from the world's countries.
export function continentLand(countries: CountryLand[]): ContinentLand {
  const pieces = Object.fromEntries(CONTINENTS.map((c) => [c, [] as Rings[][]])) as Record<Continent, Rings[][]>;
  for (const country of countries) {
    const home = FROM_NATURAL_EARTH[country.continent];
    let rest = polygonsOf(country.geometry);
    for (const { box, to } of SPLITS[country.id] ?? []) {
      const moved = polygonClipping.intersection(asGeom(rest), asGeom([boxPolygon(box)])) as unknown as Rings[];
      if (moved.length > 0) pieces[to].push(moved);
      rest = polygonClipping.difference(asGeom(rest), asGeom([boxPolygon(box)])) as unknown as Rings[];
    }
    if (home && rest.length > 0) pieces[home].push(rest);
  }
  return Object.fromEntries(CONTINENTS.map((c) => [c, pieces[c].flat()])) as ContinentLand;
}

export type ContinentShare = { continent: Continent; areaKm2: number; share: number };

// The shape's area on each continent, biggest first; continents it doesn't
// touch are left out.
export function continentShares(shape: MultiPolygon, land: ContinentLand): ContinentShare[] {
  const total = areaKm2(shape);
  if (total === 0 || shape.coordinates.length === 0) return [];
  // The land is within -180..180; a shape across the antimeridian may not be.
  const polygons = toStandardLongitudes(shape.coordinates as Rings[]);
  const shapeBox = polygons.map(boxOf).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
  const shares: ContinentShare[] = [];
  for (const continent of CONTINENTS) {
    const nearby = land[continent].filter((p) => {
      const b = boxOf(p);
      return b[0] <= shapeBox[2] && shapeBox[0] <= b[2] && b[1] <= shapeBox[3] && shapeBox[1] <= b[3];
    });
    if (nearby.length === 0) continue;
    // The shape is wound for d3 (clockwise); polygon-clipping takes either.
    const inside = polygonClipping.intersection(asGeom(polygons), asGeom(nearby)) as unknown as Rings[];
    const area = inside.length > 0 ? areaKm2(windForD3(inside)) : 0;
    if (area > 0) shares.push({ continent, areaKm2: area, share: area / total });
  }
  return shares.sort((a, b) => b.areaKm2 - a.areaKm2);
}

// polygon-clipping output winds counter-clockwise; d3's area needs clockwise.
function windForD3(polygons: Rings[]): MultiPolygon {
  return { type: "MultiPolygon", coordinates: polygons.map((rings) => rings.map((r) => [...r].reverse())) };
}
