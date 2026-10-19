"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { matchEmpire, type EmpireMatch } from "@/lib/matchEmpireName";
import { pickLocalized } from "@/lib/pickLocalized";
import type { EmpireSummary } from "@/lib/types";

interface EmpireAutocompleteProps {
  empires: EmpireSummary[];
  // Changes after each guess; clears the field without remounting it, so it
  // keeps focus (and the phone keyboard stays up) for the next guess.
  clearKey: number;
  // A guess is in flight. The input goes read-only rather than disabled,
  // because disabling it would drop focus.
  busy?: boolean;
  onSelect: (empireId: number | null) => void;
  // Enter with the suggestion list closed (i.e. after picking one) submits
  // the guess, same as clicking the guess button.
  onSubmit: () => void;
}

interface Suggestion extends EmpireMatch {
  empire: EmpireSummary;
  name: string;
}

export function EmpireAutocomplete({ empires, clearKey, busy, onSelect, onSubmit }: EmpireAutocompleteProps) {
  const t = useTranslations("Game");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastClearKey, setLastClearKey] = useState(clearKey);

  // Reset during render when clearKey changes (React's recommended pattern
  // for "reset state when a prop changes", instead of an effect).
  if (clearKey !== lastClearKey) {
    setLastClearKey(clearKey);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!query.trim()) return [];
    const matches = empires
      .map((empire) => {
        const name = pickLocalized(empire.nameEn, empire.namePt, locale);
        // The name in the other language counts as one more alias.
        const otherName = name === empire.nameEn ? empire.namePt : empire.nameEn;
        const match = matchEmpire(name, [otherName, ...(empire.aliases ?? [])], query);
        return match ? { empire, name, ...match } : null;
      })
      .filter((s): s is Suggestion => s !== null);
    // Empires matched by their own name come before those matched by another one.
    return [...matches.filter((s) => !s.alias), ...matches.filter((s) => s.alias)].slice(0, 8);
  }, [empires, query, locale]);

  function selectSuggestion(suggestion: Suggestion) {
    setQuery(suggestion.name);
    setOpen(false);
    onSelect(suggestion.empire.id);
  }

  const listOpen = open && suggestions.length > 0;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      if (!listOpen) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (listOpen) selectSuggestion(suggestions[Math.min(activeIndex, suggestions.length - 1)]);
      else onSubmit();
    } else if (e.key === "Escape" && listOpen) {
      setOpen(false);
    }
  }

  function highlight(name: string, ranges: [number, number][]): ReactNode {
    if (ranges.length === 0) return name;
    const parts: ReactNode[] = [];
    let cursor = 0;
    ranges.forEach(([start, end], i) => {
      parts.push(name.slice(cursor, start));
      parts.push(
        <strong key={i} className="font-semibold text-highlight">
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
        readOnly={busy}
        aria-busy={busy}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
          onSelect(null);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={listOpen}
        aria-controls="empire-suggestions"
        aria-activedescendant={listOpen ? `empire-suggestion-${activeIndex}` : undefined}
        aria-autocomplete="list"
        onBlur={() => setOpen(false)}
        placeholder={t("guessPlaceholder")}
        className="w-full rounded-full border border-line bg-surface px-4 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-highlight read-only:opacity-60 md:py-1.5"
      />
      {/* Opens upward on phones, where the input is pinned to the bottom
          of the screen (see GameBoard). */}
      {listOpen && (
        <ul id="empire-suggestions" role="listbox" className="absolute bottom-full z-10 mb-1 w-full md:top-full md:bottom-auto md:mt-1 md:mb-0 rounded-lg border border-line bg-background py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.empire.id} id={`empire-suggestion-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectSuggestion(s)}
                className={`block w-full px-4 py-2 text-left text-sm ${
                  i === activeIndex ? "bg-surface" : ""
                }`}
              >
                {highlight(s.name, s.ranges)}
                {s.alias && <span className="ml-1.5 text-muted">({highlight(s.alias.text, s.alias.ranges)})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
