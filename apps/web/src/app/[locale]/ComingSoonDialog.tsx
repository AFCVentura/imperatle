"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { COMING_SOON_EVENT, type ComingSoonFeature } from "@/lib/dialogs";
import { AppDialog } from "./AppDialog";

const PERKS: Record<ComingSoonFeature, readonly string[]> = {
  support: ["noAds", "practice", "archive", "creator", "request"],
  account: ["sync", "google", "safe"],
};

// One dialog for every menu item whose feature isn't built yet (support,
// accounts): what it will be, what it will give, and a clear "coming soon".
// When support ships, the account is created inside that flow.
export function ComingSoonDialog() {
  const t = useTranslations("ComingSoon");
  const [feature, setFeature] = useState<ComingSoonFeature>("support");

  return (
    <AppDialog
      event={COMING_SOON_EVENT}
      title={t(`${feature}.title`)}
      onOpen={(e) => {
        if (e instanceof CustomEvent) setFeature(e.detail as ComingSoonFeature);
      }}
      selectable
    >
      <span className="-mt-3 self-start rounded-full border border-highlight/60 px-2.5 py-0.5 font-display text-xs tracking-wide text-highlight">
        {t("badge")}
      </span>
      <p>{t(`${feature}.intro`)}</p>
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-base text-muted">{t(`${feature}.perksTitle`)}</p>
        <ul className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5">
          {PERKS[feature].map((perk) => (
            <li key={perk} className="flex gap-2">
              <span aria-hidden className="text-highlight">
                ◆
              </span>
              <span>
                <strong className="font-semibold">{t(`${feature}.perks.${perk}.title`)}:</strong>{" "}
                {t(`${feature}.perks.${perk}.text`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-muted">{t(`${feature}.note`)}</p>
      <form method="dialog" className="self-center">
        <button className="rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85">
          {t("ok")}
        </button>
      </form>
    </AppDialog>
  );
}
