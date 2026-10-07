"use client";

import { useTranslations } from "next-intl";
import { HOW_TO_PLAY_EVENT } from "@/lib/dialogs";
import { AppDialog } from "./AppDialog";

export function HowToPlayDialog({ attemptsAllowed }: { attemptsAllowed: number | null }) {
  const t = useTranslations("HowToPlay");
  const tGame = useTranslations("Game");

  return (
    <AppDialog event={HOW_TO_PLAY_EVENT} title={t("title")}>
      <p>{attemptsAllowed ? t("goal", { attempts: attemptsAllowed }) : t("goalNoCount")}</p>
      <p>{t("guess")}</p>

      <div className="flex flex-col gap-1.5">
        <p>{t("compare")}</p>
        <ul className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs">
          <li>
            <span className="inline-block w-5 font-semibold text-danger">✕</span>
            {t("wrong")}
          </li>
          <li>
            <span className="inline-block w-5 font-semibold">▲</span>
            {t("bigger")}
          </li>
          <li>
            <span className="inline-block w-5 font-semibold">▼</span>
            {t("smaller")}
          </li>
          <li>
            <span className="inline-block w-5 font-semibold">≈</span>
            {t("approximate")}
          </li>
        </ul>
      </div>

      <p>{t("hints")}</p>
      <p>{t("inspect")}</p>
      <p className="font-display text-muted">{t("daily")}</p>

      <form method="dialog" className="self-center">
        <button className="rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85">
          {tGame("startPlaying")}
        </button>
      </form>
    </AppDialog>
  );
}
