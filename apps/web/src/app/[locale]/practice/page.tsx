import { getTranslations, setRequestLocale } from "next-intl/server";
import { getEmpires } from "@/lib/api";
import type { EmpireSummary } from "@/lib/types";
import { PracticeClient } from "./PracticeClient";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Practice" });
  return { title: `${t("title")} · Imperatle`, robots: { index: false } };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Practice");
  const tGame = await getTranslations("Game");

  let empires: EmpireSummary[] | null = null;
  try {
    empires = await getEmpires();
  } catch {
    empires = null;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-3 px-4 pt-3 pb-8 sm:px-6">
      <h1 className="font-display text-2xl tracking-wide">{t("title")}</h1>
      {empires ? <PracticeClient empires={empires} /> : <p className="text-sm text-danger">{tGame("loadError")}</p>}
    </div>
  );
}
