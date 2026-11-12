import type { MultiPolygon } from "geojson";
import type {
  ArchiveChallenge,
  ArchiveList,
  ChallengeProgress,
  ChallengeReveal,
  EmpireAnswer,
  EmpireSummary,
  GuessComparison,
  GuessResponse,
  PracticeOptions,
  PracticeSession,
  StatsResponse,
  TodayChallenge,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getTodayChallenge(): Promise<TodayChallenge | null> {
  const res = await fetch(`${API_URL}/challenges/today`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load today's challenge: ${res.status}`);
  return res.json();
}

// The day's empire shape: coordinates only. By date, so the browser can cache
// it; the API refuses future dates. Not in development, where the DEV buttons
// change today's empire and a cached map would be the previous one's.
export async function getMapShape(date: string): Promise<MultiPolygon> {
  const res = await fetch(`${API_URL}/challenges/${date}/map`, process.env.NODE_ENV === "production" ? undefined : { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load the map: ${res.status}`);
  return res.json();
}

// A guessed empire's shape, outlined over a day's map (daily game or
// archive). The API only serves an empire this player already guessed that day.
export async function getGuessShape(date: string, empireId: number): Promise<MultiPolygon> {
  const res = await fetch(`${API_URL}/challenges/${date}/guesses/${empireId}/map`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load the guess's map: ${res.status}`);
  return res.json();
}

export async function getEmpires(): Promise<EmpireSummary[]> {
  const res = await fetch(`${API_URL}/empires`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load empires: ${res.status}`);
  return res.json();
}

// The public empire pages (list, sitemap, one page each). Cached for an hour:
// content changes only with a deploy.
export async function getEmpireList(): Promise<EmpireSummary[]> {
  const res = await fetch(`${API_URL}/empires`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Failed to load empires: ${res.status}`);
  return res.json();
}

export async function getEmpirePage(slug: string): Promise<EmpireAnswer | null> {
  const res = await fetch(`${API_URL}/empires/${encodeURIComponent(slug)}`, { next: { revalidate: 3600 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load empire ${slug}: ${res.status}`);
  return res.json();
}

export async function submitGuess(empireId: number): Promise<GuessResponse> {
  const res = await fetch(`${API_URL}/challenges/today/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ empireId }),
  });
  if (!res.ok) throw new Error(`Failed to submit guess: ${res.status}`);
  return res.json();
}

// The player's own game today as the server has it, guesses included: the
// account's when signed in, so a second device shows the same board.
export async function getTodayProgress(): Promise<ChallengeProgress> {
  const res = await fetch(`${API_URL}/challenges/today/progress`, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load today's progress: ${res.status}`);
  return res.json();
}

// The player's own history (the account's when signed in, otherwise this
// browser's anonymous cookie) plus
// everyone's results for today.
export async function getStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_URL}/stats`, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load stats: ${res.status}`);
  return res.json();
}

export type FeedbackCategory = "Bug" | "Idea" | "Content" | "Other";

export interface FeedbackInput {
  category: FeedbackCategory;
  message: string;
  email: string | null;
  locale: string;
  // Honeypot field, empty for real people.
  website: string;
}

export async function sendFeedback(input: FeedbackInput): Promise<"ok" | "tooMany" | "error"> {
  try {
    const res = await fetch(`${API_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (res.status === 429) return "tooMany";
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

// Dev-only debug tool -- the API rejects this outside Development, see
// ChallengesController.ResetToday.
export async function resetTodayChallenge(): Promise<void> {
  const res = await fetch(`${API_URL}/challenges/today/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to reset today's challenge: ${res.status}`);
}

// Dev-only debug tools behind the header's DEV buttons -- the API rejects
// these outside Development, see DevController.
export async function devForceToday(slug: string): Promise<void> {
  const res = await fetch(`${API_URL}/dev/today/force/${slug}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to force today's empire: ${res.status}`);
}

export interface DevPreview {
  date: string;
  guesses: { empireId: number; nameEn: string; namePt: string; comparison: GuessComparison }[];
  reveal: ChallengeReveal;
}

export async function devNextWithGuesses(): Promise<DevPreview> {
  const res = await fetch(`${API_URL}/dev/today/next-with-guesses`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to load the next empire: ${res.status}`);
  return res.json();
}

// --- Supporter perks. Every call carries the cookies: the API decides who is
// a supporter, and answers 403 to everyone else. ---

export class PerkLockedError extends Error {
  constructor() {
    super("Supporters only");
  }
}

// Practice only opens once today's daily game is over (409
// "daily_not_finished"): before that it could show today's empire.
export class DailyNotFinishedError extends Error {
  constructor() {
    super("Finish today's challenge first");
  }
}

export class ApiStatusError extends Error {
  constructor(
    path: string,
    readonly status: number,
  ) {
    super(`${path}: ${status}`);
  }
}

async function perkFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (res.status === 403) throw new PerkLockedError();
  if (res.status === 409) {
    const body = (await res.json().catch(() => null)) as { code?: string } | null;
    if (body?.code === "daily_not_finished") throw new DailyNotFinishedError();
  }
  if (!res.ok) throw new ApiStatusError(path, res.status);
  return res.json() as Promise<T>;
}

export const getArchive = () => perkFetch<ArchiveList>("/archive");

export const getArchiveChallenge = (date: string) => perkFetch<ArchiveChallenge>(`/archive/${date}`);

export const submitArchiveGuess = (date: string, empireId: number) =>
  perkFetch<GuessResponse>(`/archive/${date}/guess`, { method: "POST", body: JSON.stringify({ empireId }) });

function practiceQuery(options: PracticeOptions): string {
  const params = new URLSearchParams({
    difficulty: options.difficulty,
    attempts: String(options.attempts),
    hints: String(options.hints),
    map: options.map,
  });
  // Repeated keys for several picks (eras=0&eras=2), as ASP.NET Core binds lists.
  for (const era of options.eras) params.append("eras", String(era));
  for (const continent of options.continents) params.append("continents", String(continent));
  return params.toString();
}

export const getPracticePool = (options: PracticeOptions) =>
  perkFetch<{ count: number }>(`/practice/pool?${practiceQuery(options)}`).then((r) => r.count);

// Null when the options match too few empires to start a round.
export async function startPractice(options: PracticeOptions): Promise<PracticeSession | null> {
  try {
    return await perkFetch<PracticeSession>("/practice", { method: "POST", body: JSON.stringify(options) });
  } catch (e) {
    if (e instanceof ApiStatusError && e.status === 422) return null;
    throw e;
  }
}

export const getPracticeSession = (id: string) => perkFetch<PracticeSession>(`/practice/${id}`);

export const getPracticeMap = (id: string) => perkFetch<MultiPolygon>(`/practice/${id}/map`);

export const getPracticeGuessShape = (id: string, empireId: number) =>
  perkFetch<MultiPolygon>(`/practice/${id}/guesses/${empireId}/map`);

export const submitPracticeGuess = (id: string, empireId: number) =>
  perkFetch<GuessResponse>(`/practice/${id}/guess`, { method: "POST", body: JSON.stringify({ empireId }) });
