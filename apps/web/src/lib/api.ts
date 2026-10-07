import type { EmpireSummary, GuessResponse, StatsResponse, TodayChallenge } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getTodayChallenge(): Promise<TodayChallenge | null> {
  const res = await fetch(`${API_URL}/challenges/today`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load today's challenge: ${res.status}`);
  return res.json();
}

export async function getEmpires(): Promise<EmpireSummary[]> {
  const res = await fetch(`${API_URL}/empires`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load empires: ${res.status}`);
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

// The player's own history (identified by the anonymous cookie) plus
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
