import type { Metadata } from "next";
import { Cinzel, Spectral } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getTodayChallenge } from "@/lib/api";
import { Footer } from "./Footer";
import { Header } from "./Header";
import "../globals.css";

// Display and body fonts (see globals.css).
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"] });
const spectral = Spectral({ variable: "--font-spectral", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Imperatle",
  description: "Guess the historical empire",
};

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
  // the footer's challenge number -- cheap Postgres lookup, not worth wiring
  // a shared cache for at this stage.
  let challengeNumber: number | null = null;
  try {
    const challenge = await getTodayChallenge();
    challengeNumber = challenge?.challengeNumber ?? null;
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
