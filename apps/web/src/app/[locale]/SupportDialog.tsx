"use client";

import { useTranslations } from "next-intl";
import { SUPPORT_EVENT } from "@/lib/dialogs";
import { AppDialog } from "./AppDialog";

const PERKS = ["noAds", "practice", "archive", "creator", "request"] as const;

// Support isn't live yet (no Stripe, no accounts): this explains why to
// support and what supporters will get, with the button disabled. When it
// ships, the account is created inside this flow -- there's no standalone
// "create account".
export function SupportDialog() {
  const t = useTranslations("Support");

  return (
    <AppDialog event={SUPPORT_EVENT} title={t("title")} selectable>
      <p>{t("intro")}</p>
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-base text-muted">{t("perksTitle")}</p>
        <ul className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex gap-2">
              <span aria-hidden className="text-highlight">
                ◆
              </span>
              <span>
                <strong className="font-semibold">{t(`perks.${perk}.title`)}</strong>
                {" — "}
                {t(`perks.${perk}.text`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-muted">{t("note")}</p>
      <button
        type="button"
        disabled
        className="self-center rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground opacity-50"
      >
        {t("comingSoon")}
      </button>
    </AppDialog>
  );
}
