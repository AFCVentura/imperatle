import type { Metadata } from "next";
import { Cinzel, Spectral } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getTodayChallenge } from "@/lib/api";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HowToPlayDialog } from "./HowToPlayDialog";
import { AboutDialog } from "./AboutDialog";
import { FeedbackDialog } from "./FeedbackDialog";
import { StatsDialog } from "./StatsDialog";
import { ComingSoonDialog } from "./ComingSoonDialog";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

// Display and body fonts (see globals.css).
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"] });
const spectral = Spectral({ variable: "--font-spectral", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// hreflang alternates: tells search engines /en and /pt are the same page in
// two languages. The game is a single page, so the layout covers it; a page
// with its own path would need its own alternates.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: "Imperatle",
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
        "x-default": "/",
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Fetched again here (page.tsx also loads it for the game itself) just for
  // the footer's challenge number and the attempt count in "How to play" -- cheap Postgres lookup, not worth wiring
  // a shared cache for at this stage.
  let challengeNumber: number | null = null;
  let attemptsAllowed: number | null = null;
  try {
    const challenge = await getTodayChallenge();
    challengeNumber = challenge?.challengeNumber ?? null;
    attemptsAllowed = challenge?.attemptsAllowed ?? null;
  } catch {
    challengeNumber = null;
  }

  return (
    <html
      lang={locale}
      className={`${cinzel.variable} ${spectral.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer challengeNumber={challengeNumber} />
          <HowToPlayDialog attemptsAllowed={attemptsAllowed} />
          <StatsDialog />
          <ComingSoonDialog />
          <FeedbackDialog />
          <AboutDialog />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
