// Worldle-style matching: try a plain substring match first, then fall back
// to initials (e.g. "uae" -> "United Arab Emirates"). Returns the [start, end)
// ranges into `name` to highlight, or null when the query doesn't match.

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchEmpireByQuery(name: string, query: string): [number, number][] | null {
  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return null;

  const normalizedName = normalize(name);

  const substringIndex = normalizedName.indexOf(normalizedQuery);
  if (substringIndex !== -1) {
    return [[substringIndex, substringIndex + normalizedQuery.length]];
  }

  const words = name.split(/\s+/);
  const initials = words.map((word) => normalize(word)[0] ?? "").join("");
  const initialsIndex = initials.indexOf(normalizedQuery);
  if (initialsIndex === -1) return null;

  const ranges: [number, number][] = [];
  let cursor = 0;
  words.forEach((word, i) => {
    if (i >= initialsIndex && i < initialsIndex + normalizedQuery.length) {
      ranges.push([cursor, cursor + 1]);
    }
    cursor += word.length + 1;
  });
  return ranges;
}

export interface EmpireMatch {
  // Ranges to highlight in the shown name; empty when only another name matched.
  ranges: [number, number][];
  // The other name that matched, shown next to the empire's name.
  alias?: { text: string; ranges: [number, number][] };
}

// Matches the empire's name in the player's language first (substring or
// initials), then its other names: the name in the other language and its
// aliases (spellings like "Mugal", or "China" for a Chinese dynasty), by
// substring only, so short queries don't pull in unrelated empires by initials.
export function matchEmpire(name: string, otherNames: string[], query: string): EmpireMatch | null {
  const ranges = matchEmpireByQuery(name, query);
  if (ranges) return { ranges };

  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return null;
  for (const other of otherNames) {
    const index = normalize(other).indexOf(normalizedQuery);
    if (index !== -1) return { ranges: [], alias: { text: other, ranges: [[index, index + normalizedQuery.length]] } };
  }
  return null;
}
