import type { Feature, FeatureCollection, LineString, MultiLineString, MultiPolygon, Polygon } from "geojson";
import { geoCentroid, geoDistance } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

// Shared by the flat map and the globe: the world (Natural Earth, built by
// scripts/maps/build-world.mjs) and the empire's bare shape (coordinates only,
// from scripts/maps/extract-empire.mjs).

export type MapStage = 1 | 2 | 3; // 1 outline, 2 + continents, 3 + countries
export type MapLocale = "en" | "pt";

export type CountryProps = { en: string; pt: string; continent: string };
export type CountryFeature = Feature<MultiPolygon, CountryProps>;
export type WorldTopology = Topology<{ countries: GeometryCollection<CountryProps> }>;

export type World = {
  countries: CountryFeature[];
  land: MultiPolygon;
  borders: MultiLineString;
};

export type WorldFile = "world.json" | "world-light.json";

const worldPromises = new Map<WorldFile, Promise<World>>();

// Fetched once per page; the browser caches the files across visits. The light
// version is what the globe draws while spinning.
export function loadWorld(file: WorldFile = "world.json"): Promise<World> {
  let p = worldPromises.get(file);
  if (!p) {
    p = fetch(`/geo/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${file}: ${r.status}`);
        return r.json() as Promise<WorldTopology>;
      })
      .then(toWorld)
      .catch((e) => {
        worldPromises.delete(file);
        throw e;
      });
    worldPromises.set(file, p);
  }
  return p;
}

export function toWorld(topo: WorldTopology): World {
  const obj = topo.objects.countries;
  const fc = feature(topo, obj) as FeatureCollection<MultiPolygon, CountryProps>;
  return {
    countries: fc.features,
    // Land and borders come from the same arcs as the countries, so the coast
    // and the borders line up exactly at any zoom.
    land: merge(topo, obj.geometries as never),
    borders: mesh(topo, obj, (a, b) => a !== b),
  };
}

export const countryName = (c: CountryFeature, locale: MapLocale) => c.properties[locale] ?? c.properties.en;

// Reads the theme's map tokens (globals.css) for the canvas, which can't use
// CSS variables directly.
export function readMapColors(el: Element) {
  const s = getComputedStyle(el);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    ocean: v("--map-ocean"),
    land: v("--map"),
    coast: v("--map-line"),
    border: v("--map-border"),
    empire: v("--map-empire"),
    empireLine: v("--map-empire-line"),
  };
}

// The globe skips whatever is on the far side or off screen. Each island,
// coast and border line gets a bounding circle on the sphere once, so a frame
// can tell in one distance check whether it's worth projecting.
export type Piece<G> = { geometry: G; center: [number, number]; radius: number };
export type WorldPieces = { land: Piece<Polygon>[]; borders: Piece<LineString>[] };

const piecesCache = new WeakMap<World, WorldPieces>();

function piece<G extends Polygon | LineString>(geometry: G): Piece<G> {
  const center = geoCentroid(geometry);
  const points = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates;
  const radius = points.reduce((r, p) => Math.max(r, geoDistance(center, p as [number, number])), 0);
  return { geometry, center, radius };
}

export function worldPieces(world: World): WorldPieces {
  let p = piecesCache.get(world);
  if (!p) {
    p = {
      land: world.land.coordinates.map((coordinates) => piece<Polygon>({ type: "Polygon", coordinates })),
      borders: world.borders.coordinates.map((coordinates) => piece<LineString>({ type: "LineString", coordinates })),
    };
    piecesCache.set(world, p);
  }
  return p;
}

// Pieces that can show up with the globe centred on viewCenter, when the
// screen reaches visibleAngle (radians) from the centre.
export function visiblePieces<G>(pieces: Piece<G>[], viewCenter: [number, number], visibleAngle: number) {
  return pieces.filter((p) => geoDistance(viewCenter, p.center) - p.radius < visibleAngle);
}
