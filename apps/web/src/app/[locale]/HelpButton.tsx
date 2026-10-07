"use client";

import { useTranslations } from "next-intl";
import { openHowToPlay } from "@/lib/dialogs";

export function HelpButton() {
  const t = useTranslations("HowToPlay");

  return (
    <button
      type="button"
      onClick={openHowToPlay}
      aria-label={t("title")}
      title={t("title")}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted/60 font-display text-[11px] font-semibold text-muted hover:bg-surface"
    >
      ?
    </button>
  );
}
