"use client";

import { useSyncExternalStore } from "react";

// Light or dark look. "system" (the default) follows the device setting;
// "light" and "dark" pin it. The choice lives in localStorage, and the
// resolved theme sits on <html data-theme>, which globals.css reads.
export type ThemePreference = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

const STORAGE_KEY = "imperatle:theme";
const THEME_EVENT = "imperatle:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Runs in <head> before the page paints (see the layout), so a pinned theme
// never flashes the other one first. It also follows the device switching
// between light and dark while the page is open (only matters on "system").
// Same rule as applyTheme below, kept self-contained since it's a string.
export const THEME_BOOT_SCRIPT = `(function(){var q=window.matchMedia(${JSON.stringify(DARK_QUERY)});function a(){var p=null;try{p=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});}catch(e){}var d=p==="dark"||(p!=="light"&&q.matches);document.documentElement.dataset.theme=d?"dark":"light";window.dispatchEvent(new Event(${JSON.stringify(THEME_EVENT)}));}a();q.addEventListener("change",a);})();`;

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    // localStorage unavailable (private mode): follow the device.
    return "system";
  }
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Not saved, but still applied to this page.
  }
  applyTheme(preference);
}

// Fires on a choice in the menu and when the boot script follows the device.
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

/** The player's choice, for the menu. "system" on the server. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}

/** The theme on screen now. The maps redraw their canvas when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}
