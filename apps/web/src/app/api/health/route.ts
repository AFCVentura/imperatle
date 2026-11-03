// GET /api/health: liveness for the container (Azure Container Apps probes and
// the Docker HEALTHCHECK). Answers from this process alone, without calling the
// API, so a slow or cold API never gets the web replica restarted. Outside the
// locale proxy (its matcher skips /api), so there's no redirect to /en or /pt.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
