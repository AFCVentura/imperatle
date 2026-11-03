import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getEmpires } from "@/lib/api";
import { isIsoDate } from "@/lib/archive";
import type { EmpireSummary } from "@/lib/types";
import { ArchiveDayGame } from "./ArchiveDayGame";

type Props = { params: Promise<{ locale: string; date: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Archive" });
  return { title: `${t("title")} · Imperatle`, robots: { index: false } };
}

export default async function Page({ params }: Props) {
  const { locale, date } = await params;
  if (!isIsoDate(date)) notFound();
  setRequestLocale(locale);
  const tGame = await getTranslations("Game");

  let empires: EmpireSummary[] | null = null;
  try {
    empires = await getEmpires();
  } catch {
    empires = null;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 px-4 pt-1 pb-8 sm:px-6">
      {empires ? <ArchiveDayGame date={date} empires={empires} /> : <p className="text-sm text-danger">{tGame("loadError")}</p>}
    </div>
  );
}
