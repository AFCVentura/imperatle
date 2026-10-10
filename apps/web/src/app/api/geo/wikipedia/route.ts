import { NextResponse, type NextRequest } from "next/server";
import { jsonError, notInProduction } from "@/lib/devOnly";

// GET /api/geo/wikipedia?wikidata=Q12557: the English and Portuguese
// Wikipedia articles of a Wikidata item (Cliopatria records carry its id).
export async function GET(request: NextRequest) {
  const blocked = notInProduction();
  if (blocked) return blocked;

  const id = request.nextUrl.searchParams.get("wikidata") ?? "";
  if (!/^Q\d+$/.test(id)) return jsonError("wikidata must look like Q12557");

  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({ action: "wbgetentities", ids: id, props: "sitelinks", sitefilter: "enwiki|ptwiki", format: "json" }).toString();
  const res = await fetch(url, { headers: { "User-Agent": "Imperatle empire generator (https://imperatle.com)" } });
  if (!res.ok) return jsonError(`Wikidata answered ${res.status}`, 502);

  const data = (await res.json()) as { entities?: Record<string, { sitelinks?: Record<string, { title: string }> }> };
  const links = data.entities?.[id]?.sitelinks ?? {};
  const article = (lang: "en" | "pt") => {
    const title = links[`${lang}wiki`]?.title;
    return title ? `https://${lang}.wikipedia.org/wiki/${title.replaceAll(" ", "_")}` : null;
  };
  return NextResponse.json({ en: article("en"), pt: article("pt") });
}
