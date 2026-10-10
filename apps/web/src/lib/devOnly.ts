import { NextResponse } from "next/server";

// The empire generator's routes only exist in development: in production
// they answer 404 as if they weren't there.
export function notInProduction(): NextResponse | null {
  return process.env.NODE_ENV === "production" ? new NextResponse(null, { status: 404 }) : null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
