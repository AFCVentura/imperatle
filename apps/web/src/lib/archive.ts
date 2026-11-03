import type { ArchiveDay } from "./types";

export type ArchiveFilter = "all" | "notPlayed" | "played";

// "Played" means finished; a day left half-way still counts as not played.
export function matchesArchiveFilter(day: ArchiveDay, filter: ArchiveFilter): boolean {
  const finished = day.status === "Won" || day.status === "Lost";
  if (filter === "played") return finished;
  if (filter === "notPlayed") return !finished;
  return true;
}

export interface ArchiveMonth {
  // "2026-11"
  key: string;
  days: ArchiveDay[];
}

// Days arrive newest first; months keep that order.
export function groupArchiveByMonth(days: ArchiveDay[], filter: ArchiveFilter): ArchiveMonth[] {
  const months: ArchiveMonth[] = [];
  for (const day of days) {
    if (!matchesArchiveFilter(day, filter)) continue;
    const key = day.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last?.key === key) last.days.push(day);
    else months.push({ key, days: [day] });
  }
  return months;
}

// Route guard for /archive/[date]: a real calendar date as yyyy-mm-dd. The
// API decides whether it's in the archive.
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
