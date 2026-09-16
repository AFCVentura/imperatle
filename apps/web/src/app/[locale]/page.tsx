import { getTranslations } from "next-intl/server";
import { getEmpires, getTodayChallenge } from "@/lib/api";
import type { EmpireSummary, TodayChallenge } from "@/lib/types";
import { GameBoard } from "./GameBoard";

export default async function Home() {
  const tHome = await getTranslations("HomePage");
  const tGame = await getTranslations("Game");

  let challenge: TodayChallenge | null = null;
  let empires: EmpireSummary[] = [];
  let loadError = false;
  try {
    [challenge, empires] = await Promise.all([getTodayChallenge(), getEmpires()]);
  } catch {
    loadError = true;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-4 py-10 dark:bg-black sm:px-6">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">{tHome("title")}</h1>
        <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">{tHome("subtitle")}</p>
      </header>

      {loadError && <p className="text-sm text-red-500">{tGame("loadError")}</p>}
      {!loadError && !challenge && <p className="text-zinc-600 dark:text-zinc-400">{tGame("noChallengeToday")}</p>}
      {!loadError && challenge && <GameBoard challenge={challenge} empires={empires} />}
    </div>
  );
}
