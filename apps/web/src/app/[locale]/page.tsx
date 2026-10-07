import { getTranslations } from "next-intl/server";
import { getEmpires, getTodayChallenge } from "@/lib/api";
import type { EmpireSummary, TodayChallenge } from "@/lib/types";
import { GameBoard } from "./GameBoard";
import { HelpButton } from "./HelpButton";

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
    <div className="flex flex-1 flex-col items-center gap-1.5 px-4 pt-1 pb-8 sm:px-6">
      <div className="flex items-center gap-1.5">
        <p className="text-center text-sm italic text-muted">{tHome("subtitle")}</p>
        <HelpButton />
      </div>

      {loadError && <p className="text-sm text-danger">{tGame("loadError")}</p>}
      {!loadError && !challenge && <p className="text-muted">{tGame("noChallengeToday")}</p>}
      {!loadError && challenge && <GameBoard challenge={challenge} empires={empires} />}
    </div>
  );
}
