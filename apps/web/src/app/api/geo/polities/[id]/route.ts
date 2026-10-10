import { NextResponse } from "next/server";
import { jsonError, notInProduction } from "@/lib/devOnly";
import { getPolity } from "@/map/build/localData";

// GET /api/geo/polities/{id}: a polity with every year range it has a record for.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = notInProduction();
  if (blocked) return blocked;
  const polity = getPolity((await params).id);
  return polity ? NextResponse.json(polity) : jsonError("polity not found", 404);
}
