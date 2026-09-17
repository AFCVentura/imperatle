import type { EmpireSummary, GuessResponse, TodayChallenge } from "./types";

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

// Dev-only debug tool -- the API rejects this outside Development, see
// ChallengesController.ResetToday.
export async function resetTodayChallenge(): Promise<void> {
  const res = await fetch(`${API_URL}/challenges/today/reset`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to reset today's challenge: ${res.status}`);
}
