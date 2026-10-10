import { NextResponse } from "next/server";
import { jsonError, notInProduction } from "@/lib/devOnly";
import { continentShares } from "@/map/build/continents";
import { partPolygons, worldLand, type PartRef } from "@/map/build/localData";
import { areaKm2, buildShape, rawShape } from "@/map/build/shape";

export type ShapeRequest = { parts: PartRef[] };

// POST /api/geo/shape { parts: [{ id, year } | { country }] }: the parts merged and clipped
// by the game's land (what the game draws), the unclipped version to compare,
// its area and how it splits across continents.
export async function POST(request: Request) {
  const blocked = notInProduction();
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as ShapeRequest | null;
  if (!body || !Array.isArray(body.parts) || body.parts.length === 0) return jsonError("parts is required");

  try {
    const { polygons, datasetAreaKm2 } = partPolygons(body.parts);
    const { land, continents } = worldLand();
    const shape = buildShape(polygons, land);
    return NextResponse.json({
      shape,
      raw: rawShape(polygons),
      areaKm2: areaKm2(shape),
      datasetAreaKm2,
      continents: continentShares(shape, continents),
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e));
  }
}
