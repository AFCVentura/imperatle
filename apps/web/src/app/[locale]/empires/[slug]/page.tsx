import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEmpirePage } from "@/lib/api";
import { pickLocalized } from "@/lib/pickLocalized";
import { CuriosityList, EmpireSheet } from "../../EmpireSheet";

type Props = { params: Promise<{ locale: string; slug: string }> };

// The first sentence or so of the summary, for search results.
function shortDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = cut.lastIndexOf(". ");
  return end > 60 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const empire = await getEmpirePage(slug).catch(() => null);
  if (!empire) return { title: "Imperatle" };
  const name = pickLocalized(empire.nameEn, empire.namePt, locale, empire.nameEs);
  return {
    title: `${name} · Imperatle`,
    description: shortDescription(pickLocalized(empire.summaryEn ?? "", empire.summaryPt ?? "", locale, empire.summaryEs)),
    alternates: {
      canonical: `/${locale}/empires/${slug}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/empires/${slug}`])),
    },
  };
}

// One empire's page: the same fact sheet and curiosities as the end of a
// round, as text search engines can read. No map (see the API's
// EmpiresController.GetBySlug).
export default async function EmpirePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Empires");
  const tGame = await getTranslations("Game");

  const empire = await getEmpirePage(slug);
  if (!empire) notFound();

  const name = pickLocalized(empire.nameEn, empire.namePt, locale, empire.nameEs);
  const wikipedia = pickLocalized(empire.wikipediaEn ?? "", empire.wikipediaPt ?? "", locale, empire.wikipediaEs);

  return (
    <article className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-10">
      <header className="flex flex-col gap-1">
        <Link href="/empires" className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
          {t("backToList")}
        </Link>
        <h1 className="font-display text-2xl">{name}</h1>
      </header>

      <section className="rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-4 py-2.5 font-display text-base tracking-wide text-muted">{tGame("sheetTitle")}</h2>
        <EmpireSheet answer={empire} />
      </section>

      {empire.hints.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-2.5 font-display text-base tracking-wide text-muted">{tGame("curiositiesTitle")}</h2>
          <CuriosityList answer={empire} />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/" className="rounded-full bg-accent px-5 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/85">
          {t("playToday")}
        </Link>
        {wikipedia && (
          <a
            href={wikipedia}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-surface"
          >
            {tGame("readOnWikipedia")}
          </a>
        )}
      </div>
    </article>
  );
}
