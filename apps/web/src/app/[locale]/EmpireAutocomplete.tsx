"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { matchEmpireByQuery } from "@/lib/matchEmpireName";
import { pickLocalized } from "@/lib/pickLocalized";
import type { EmpireSummary } from "@/lib/types";

interface EmpireAutocompleteProps {
  empires: EmpireSummary[];
  disabled?: boolean;
  onSelect: (empireId: number | null) => void;
}

interface Suggestion {
  empire: EmpireSummary;
  name: string;
  ranges: [number, number][];
}

export function EmpireAutocomplete({ empires, disabled, onSelect }: EmpireAutocompleteProps) {
  const t = useTranslations("Game");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!query.trim()) return [];
    return empires
      .map((empire) => {
        const name = pickLocalized(empire.nameEn, empire.namePt, locale);
        const ranges = matchEmpireByQuery(name, query);
        return ranges ? { empire, name, ranges } : null;
      })
      .filter((s): s is Suggestion => s !== null)
      .slice(0, 8);
  }, [empires, query, locale]);

  function selectSuggestion(suggestion: Suggestion) {
    setQuery(suggestion.name);
    setOpen(false);
    onSelect(suggestion.empire.id);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      selectSuggestion(suggestions[0]);
    }
  }

  function highlight(name: string, ranges: [number, number][]): ReactNode {
    if (ranges.length === 0) return name;
    const parts: ReactNode[] = [];
    let cursor = 0;
    ranges.forEach(([start, end], i) => {
      parts.push(name.slice(cursor, start));
      parts.push(
        <strong key={i} className="font-semibold text-blue-600 dark:text-blue-400">
          {name.slice(start, end)}
        </strong>,
      );
      cursor = end;
    });
    parts.push(name.slice(cursor));
    return parts;
  }

  return (
    <div className="relative flex-1">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onSelect(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        placeholder={t("guessPlaceholder")}
        className="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-40 dark:border-zinc-700 dark:bg-black"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {suggestions.map((s) => (
            <li key={s.empire.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {highlight(s.name, s.ranges)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
