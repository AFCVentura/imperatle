import { geoEqualEarth } from "d3-geo";

// The way from one point to another as it looks on the flat map (Equal Earth,
// map/FlatMap.tsx), in compass degrees (0 = up/north, 90 = right/east). The
// globe uses the bearing of the shortest route instead, which on a flat map
// can point somewhere else over long distances.
//
// Centred between the two points, the short way round (as the map frames a
// guess with the answer), so the line between them never wraps around the
// edge of the map.
export function flatBearing(from: [number, number], to: [number, number]): number {
  let dLon = to[0] - from[0];
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const middle = from[0] + dLon / 2;
  const projection = geoEqualEarth().rotate([-middle, 0]);
  const a = projection(from)!;
  const b = projection([from[0] + dLon, to[1]])!;
  // Screen y grows downwards.
  const degrees = (Math.atan2(b[0] - a[0], a[1] - b[1]) * 180) / Math.PI;
  return (degrees + 360) % 360;
}
