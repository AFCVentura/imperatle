"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Each language under its own name, so it's findable by someone who can't
// read the current one.
const LOCALE_NAMES: Record<(typeof routing.locales)[number], string> = {
  en: "English",
  pt: "Português",
};

// Switches language on the same page: next-intl's router swaps the locale
// prefix of the current path (and remembers the choice in its cookie).
export function LocaleSwitcher({ onSwitch }: { onSwitch?: () => void }) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div role="group" aria-label={t("language")} className="flex flex-col gap-1.5">
      <span className="px-3 font-display text-xs tracking-wide text-muted">{t("language")}</span>
      <div className="flex gap-1 rounded-full border border-line p-1">
        {routing.locales.map((l) => {
          const active = l === locale;
          return (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={active}
              disabled={pending}
              onClick={() => {
                if (active) return;
                startTransition(() => {
                  router.replace(pathname, { locale: l });
                });
                onSwitch?.();
              }}
              className={`flex-1 rounded-full px-3 py-1 text-sm transition-colors disabled:opacity-60 ${
                active ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-surface"
              }`}
            >
              {LOCALE_NAMES[l]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
