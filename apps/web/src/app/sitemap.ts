import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getEmpireList } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

// The public pages in every language, each listing its translations
// (hreflang). The game itself changes daily; the legal pages rarely.
const PAGES: { path: string; changeFrequency: "daily" | "monthly"; priority: number }[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.2 },
  { path: "/refunds", changeFrequency: "monthly", priority: 0.2 },
  { path: "/empires", changeFrequency: "monthly", priority: 0.6 },
];

// Built per request (the empire list itself is cached for an hour): at build
// time the API isn't reachable, and a sitemap without the empires would stick.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Without the API the sitemap still lists the fixed pages.
  const empires = await getEmpireList().catch(() => []);
  const pages = [
    ...PAGES,
    ...empires.map((e) => ({ path: `/empires/${e.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
  return pages.flatMap(({ path, changeFrequency, priority }) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
      },
    })),
  );
}
