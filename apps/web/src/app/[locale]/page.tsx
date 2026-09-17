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
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <p className="text-center text-sm text-foreground/60">{tHome("subtitle")}</p>

      {loadError && <p className="text-sm text-red-500">{tGame("loadError")}</p>}
      {!loadError && !challenge && <p className="text-foreground/60">{tGame("noChallengeToday")}</p>}
      {!loadError && challenge && <GameBoard challenge={challenge} empires={empires} />}
    </div>
  );
}
