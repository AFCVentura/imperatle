import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEmpireList } from "@/lib/api";
import { pickLocalized } from "@/lib/pickLocalized";
import type { EmpireSummary } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

// Per request (the list is cached for an hour by getEmpireList): prerendered
// at build time, without the API, it would stick as an error page.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Empires" });
  return {
    title: t("indexTitle"),
    description: t("indexDescription"),
    alternates: {
      canonical: `/${locale}/empires`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/empires`])),
    },
  };
}

// Every empire in the game, alphabetically, each linking to its page. Linked
// from the footer; mostly there so search engines find every page.
export default async function EmpiresIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Empires");

  let empires: EmpireSummary[] | null = null;
  try {
    empires = await getEmpireList();
  } catch {
    empires = null;
  }
  const named = (empires ?? [])
    .map((e) => ({ slug: e.slug, name: pickLocalized(e.nameEn, e.namePt, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return (
    <article className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">{t("indexTitle")}</h1>
        <p className="text-sm leading-relaxed text-muted">{t("indexIntro", { count: named.length })}</p>
      </header>
      {empires === null ? (
        <p className="text-sm text-danger">{t("loadError")}</p>
      ) : (
        <ul className="columns-1 gap-6 text-sm sm:columns-2">
          {named.map((e) => (
            <li key={e.slug} className="break-inside-avoid py-1">
              <Link href={`/empires/${e.slug}`} className="underline-offset-2 hover:text-highlight hover:underline">
                {e.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/" className="self-start rounded-full bg-accent px-5 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/85">
        {t("playToday")}
      </Link>
    </article>
  );
}
