import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEmpireList } from "@/lib/api";

type Props = { params: Promise<{ locale: string }> };

// Per request: it counts the empires from the API, which isn't reachable at
// build time (the list itself is cached for an hour).
export const dynamic = "force-dynamic";

const FAQ_KEYS = ["free", "account", "when", "powers", "maps", "more", "list", "mistake"] as const;

const AUTHOR_URL = "https://jventura.dev";
const SOURCE_URLS = {
  clio: "https://github.com/Seshat-Global-History-Databank/cliopatria",
  license: "https://creativecommons.org/licenses/by/4.0/",
  ne: "https://www.naturalearthdata.com/",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/about`])),
    },
  };
}

// The longer About: what the game is, how it works and the FAQ, as text
// search engines and AI assistants can read (the FAQ also as FAQPage data).
// The menu's About window stays short and links here.
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AboutPage");
  const tAbout = await getTranslations("About");

  const count = await getEmpireList()
    .then((list) => list.length)
    .catch(() => 79);

  const empiresLink = (chunks: ReactNode) => (
    <Link href="/empires" className="font-semibold text-highlight underline underline-offset-2">
      {chunks}
    </Link>
  );

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: t(`faq.${key}.q`),
      acceptedAnswer: { "@type": "Answer", text: t.markup(`faq.${key}.a`, { link: (chunks) => chunks }) },
    })),
  };

  return (
    <article className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-4 pb-10 text-sm leading-relaxed">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />

      <header className="flex flex-col gap-3">
        <h1 className="font-display text-2xl">{t("title")}</h1>
        <p>{t("intro1")}</p>
        <p>{t("intro2", { count })}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-base text-muted">{t("howTitle")}</h2>
        <p>{t("how")}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base text-muted">{t("faqTitle")}</h2>
        <dl className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQ_KEYS.map((key) => (
            <div key={key} className="px-4 py-3">
              <dt className="font-semibold">{t(`faq.${key}.q`)}</dt>
              <dd className="mt-1 text-muted">{t.rich(`faq.${key}.a`, { link: empiresLink })}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-base text-muted">{tAbout("editorialTitle")}</h2>
        <p>{tAbout("editorial")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-base text-muted">{tAbout("sourcesTitle")}</h2>
        <p>
          {tAbout.rich("sources", {
            clio: (chunks) => <ExternalLink href={SOURCE_URLS.clio}>{chunks}</ExternalLink>,
            license: (chunks) => <ExternalLink href={SOURCE_URLS.license}>{chunks}</ExternalLink>,
            ne: (chunks) => <ExternalLink href={SOURCE_URLS.ne}>{chunks}</ExternalLink>,
          })}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-base text-muted">{tAbout("authorTitle")}</h2>
        <p>{tAbout.rich("author", { link: (chunks) => <ExternalLink href={AUTHOR_URL}>{chunks}</ExternalLink> })}</p>
        <p className="text-xs text-muted">{tAbout("stack")}</p>
      </section>

      <Link href="/" className="self-start rounded-full bg-accent px-5 py-1.5 font-semibold text-accent-foreground hover:bg-accent/85">
        {t("play")}
      </Link>
    </article>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-highlight underline underline-offset-2">
      {children}
    </a>
  );
}
