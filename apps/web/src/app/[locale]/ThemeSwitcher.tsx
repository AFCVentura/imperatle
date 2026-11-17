"use client";

import { useTranslations } from "next-intl";
import { THEME_PREFERENCES, setThemePreference, useThemePreference } from "@/lib/theme";

// Light, dark or the device setting (the default), in the menu next to the
// language. Same pill row as the LocaleSwitcher.
export function ThemeSwitcher() {
  const t = useTranslations("Header");
  const current = useThemePreference();

  return (
    <div role="group" aria-label={t("theme")} className="flex flex-col gap-1.5">
      <span className="px-3 font-display text-xs tracking-wide text-muted">{t("theme")}</span>
      <div className="flex gap-1 rounded-full border-2 border-line p-1">
        {THEME_PREFERENCES.map((option) => {
          const active = option === current;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setThemePreference(option)}
              className={`flex-1 rounded-full px-3 py-1 text-sm transition-colors ${
                active ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-surface"
              }`}
            >
              {t(`themeOptions.${option}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
