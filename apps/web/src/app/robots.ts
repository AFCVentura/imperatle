import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Every crawler is welcome, AI search ones included (GPTBot, PerplexityBot,
// Google-Extended...): being found is the point. Only the dev tools and the
// API proxy are left out; perk pages say noindex on their own.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dev/", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
