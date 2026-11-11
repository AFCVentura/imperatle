// Worldle-style matching: try a plain substring match first, then fall back
// to initials (e.g. "uae" -> "United Arab Emirates"). Returns the [start, end)
// ranges into `name` to highlight, or null when the query doesn't match.
// Case, accents and a leading article ("the", "o", "el"...) are ignored.

// Removes accents one character at a time, so an index into the normalized
// text is also an index into the original (for highlighting).
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Leading articles players may type in the game's three languages (en, pt,
// es). A name that starts with one still matches by substring.
const ARTICLES = new Set(["the", "o", "a", "os", "as", "el", "la", "los", "las"]);

// The normalized query without a leading article ("el imperio otomano" ->
// "imperio otomano"), or null when it has none. Only when something follows
// it, so "a" or "la" alone still search as typed.
function withoutArticle(normalizedQuery: string): string | null {
  const match = /^(\S+) (\S.*)$/.exec(normalizedQuery);
  return match && ARTICLES.has(match[1]) ? match[2] : null;
}

// The query as typed first, then without its article.
function queryVariants(query: string): string[] {
  const normalized = normalize(query.trim()).replace(/\s+/g, " ");
  if (!normalized) return [];
  const bare = withoutArticle(normalized);
  return bare ? [normalized, bare] : [normalized];
}

function matchSubstring(name: string, queries: string[]): [number, number][] | null {
  const normalizedName = normalize(name);
  for (const q of queries) {
    const index = normalizedName.indexOf(q);
    if (index !== -1) return [[index, index + q.length]];
  }
  return null;
}

export function matchEmpireByQuery(name: string, query: string): [number, number][] | null {
  const queries = queryVariants(query);
  if (queries.length === 0) return null;

  const substring = matchSubstring(name, queries);
  if (substring) return substring;

  // Initials of the name's words; any run of them matches, so "gh" finds
  // "The Golden Horde" without its article too.
  const words = name.split(/\s+/);
  const starts: number[] = [];
  let cursor = 0;
  for (const word of words) {
    starts.push(cursor);
    cursor += word.length + 1;
  }
  const initials = words.map((word) => normalize(word)[0] ?? "").join("");
  for (const q of queries) {
    const index = initials.indexOf(q);
    if (index !== -1) return starts.slice(index, index + q.length).map((start): [number, number] => [start, start + 1]);
  }
  return null;
}

export interface EmpireMatch {
  // Ranges to highlight in the shown name; empty when only another name matched.
  ranges: [number, number][];
  // The other name that matched, shown next to the empire's name.
  alias?: { text: string; ranges: [number, number][] };
}

// Matches the empire's name in the player's language first (substring or
// initials), then its other names: the names in the other languages and its
// aliases (spellings like "Mugal", or "China" for a Chinese dynasty), by
// substring only, so short queries don't pull in unrelated empires by initials.
export function matchEmpire(name: string, otherNames: string[], query: string): EmpireMatch | null {
  const ranges = matchEmpireByQuery(name, query);
  if (ranges) return { ranges };

  const queries = queryVariants(query);
  for (const other of otherNames) {
    const otherRanges = matchSubstring(other, queries);
    if (otherRanges) return { ranges: [], alias: { text: other, ranges: otherRanges } };
  }
  return null;
}

// The names to search besides the shown one: the empire's name in the other
// languages (once each, skipping a missing Spanish name) and its aliases.
export function otherEmpireNames(shown: string, names: (string | null | undefined)[], aliases: string[] = []): string[] {
  const others: string[] = [];
  for (const n of [...names, ...aliases]) {
    if (n && n !== shown && !others.includes(n)) others.push(n);
  }
  return others;
}
