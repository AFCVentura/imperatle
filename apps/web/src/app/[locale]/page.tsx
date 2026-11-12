import { getLocale, getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/site";
import { getEmpires, getTodayChallenge } from "@/lib/api";
import type { EmpireSummary, TodayChallenge } from "@/lib/types";
import { GameBoard } from "./GameBoard";
import { HelpButton } from "./HelpButton";

export default async function Home() {
  const tHome = await getTranslations("HomePage");
  const tGame = await getTranslations("Game");
  const tMeta = await getTranslations("Metadata");
  const locale = await getLocale();

  // Structured data: tells search engines and AI assistants this is a free
  // browser game, and what it's about, without guessing from the page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Imperatle",
        url: SITE_URL,
        inLanguage: locale,
      },
      {
        "@type": ["VideoGame", "WebApplication"],
        name: "Imperatle",
        url: `${SITE_URL}/${locale}`,
        description: tMeta("description"),
        inLanguage: locale,
        genre: ["Trivia", "Puzzle", "Educational", "History", "Geography"],
        gamePlatform: "Web browser",
        applicationCategory: "GameApplication",
        operatingSystem: "Any",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };

  let challenge: TodayChallenge | null = null;
  let empires: EmpireSummary[] = [];
  let loadError = false;
  try {
    [challenge, empires] = await Promise.all([getTodayChallenge(), getEmpires()]);
  } catch {
    loadError = true;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 px-4 pt-1 pb-8 sm:px-6">
      <div className="flex items-center gap-1.5">
        <h1 className="text-center text-sm italic text-muted">{tHome("subtitle")}</h1>
        <HelpButton />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {loadError && <p className="text-sm text-danger">{tGame("loadError")}</p>}
      {!loadError && !challenge && <p className="text-muted">{tGame("noChallengeToday")}</p>}
      {!loadError && challenge && <GameBoard challenge={challenge} empires={empires} />}
    </div>
  );
}
