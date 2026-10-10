import { NextResponse, type NextRequest } from "next/server";
import { jsonError, notInProduction } from "@/lib/devOnly";
import { MissingIndexError, searchPolities } from "@/map/build/localData";

// GET /api/geo/polities?q=mongol: Cliopatria polities matching the name.
export function GET(request: NextRequest) {
  const blocked = notInProduction();
  if (blocked) return blocked;
  try {
    return NextResponse.json(searchPolities(request.nextUrl.searchParams.get("q") ?? ""));
  } catch (e) {
    return jsonError(e instanceof MissingIndexError ? e.message : String(e), 500);
  }
}
