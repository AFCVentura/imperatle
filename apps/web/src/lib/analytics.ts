// Page view analytics. Only Vercel Web Analytics exists today, and it only
// reports on Vercel (it loads /_vercel/insights/script.js, which nothing else
// serves). Off Vercel (the Docker image on Azure Container Apps) there is no
// analytics at all until a provider is chosen: see
// docs/launch/front-container-apps.md, "Analytics".
//
// Vercel sets VERCEL=1 at build and run time; nothing else does.
export function vercelAnalyticsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL === "1";
}
