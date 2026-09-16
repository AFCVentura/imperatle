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
