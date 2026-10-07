// Mirrors the ASP.NET Core DTOs in apps/api/Dtos. Enums arrive from the API as
// plain numbers (System.Text.Json default) in C# declaration order, so each
// array below must stay in sync with its backend enum.

export const BROAD_ERAS = ["Antiquity", "MiddleAges", "Modern", "Contemporary"] as const;
export type BroadEra = (typeof BROAD_ERAS)[number];
export function broadEraFromApi(value: number): BroadEra {
  return BROAD_ERAS[value];
}

export const BORDER_CONFIDENCES = ["Precise", "Approximate", "Speculative"] as const;
export type BorderConfidence = (typeof BORDER_CONFIDENCES)[number];
export function borderConfidenceFromApi(value: number): BorderConfidence {
  return BORDER_CONFIDENCES[value];
}

export const CONTINENTS = ["Africa", "Asia", "Europe", "NorthAmerica", "SouthAmerica", "Oceania"] as const;
export type Continent = (typeof CONTINENTS)[number];
export function continentFromApi(value: number): Continent {
  return CONTINENTS[value];
}

export const AREA_PRECISIONS = ["Exact", "Approximate"] as const;
export type AreaPrecision = (typeof AREA_PRECISIONS)[number];
export function areaPrecisionFromApi(value: number): AreaPrecision {
  return AREA_PRECISIONS[value];
}

// Ascending order (Smaller < Approximate < Bigger), mirrors the backend enum.
export const COMPARISON_RESULTS = ["Smaller", "Approximate", "Bigger"] as const;
export type ComparisonResult = (typeof COMPARISON_RESULTS)[number];
export function comparisonFromApi(value: number): ComparisonResult {
  return COMPARISON_RESULTS[value];
}

export interface TodayChallenge {
  date: string;
  attemptsAllowed: number;
  challengeNumber: number;
  // Path served from apps/web/public; null while the empire has no map yet.
  mapUrl: string | null;
}

export interface EmpireSummary {
  id: number;
  nameEn: string;
  namePt: string;
}

export interface EmpireHint {
  textEn: string;
  textPt: string;
}

// Cumulative reveal for the current attempt count -- every field stays null
// until its stage is reached, then stays populated for the rest of the round.
export interface ChallengeReveal {
  broadEra: number | null;
  mapBorderConfidence: number | null;
  continents: number[] | null;
  primaryContinent: number | null;
  capitalEn: string | null;
  capitalPt: string | null;
  languageEn: string | null;
  languagePt: string | null;
  hints: EmpireHint[] | null;
  referenceYear: number | null;
  referenceYearPrecision: number | null;
  startYear: number | null;
  startYearPrecision: number | null;
  endYear: number | null;
  endYearPrecision: number | null;
  durationNotesEn: string | null;
  durationNotesPt: string | null;
  peakAreaKm2: number | null;
  areaPrecision: number | null;
  religionEn: string | null;
  religionPt: string | null;
}

// All-locked placeholder shown before the player's first guess -- lets the
// hint board render every row/card from the start instead of appearing as
// guesses come in.
export const EMPTY_REVEAL: ChallengeReveal = {
  broadEra: null,
  mapBorderConfidence: null,
  continents: null,
  primaryContinent: null,
  capitalEn: null,
  capitalPt: null,
  languageEn: null,
  languagePt: null,
  hints: null,
  referenceYear: null,
  referenceYearPrecision: null,
  startYear: null,
  startYearPrecision: null,
  endYear: null,
  endYearPrecision: null,
  durationNotesEn: null,
  durationNotesPt: null,
  peakAreaKm2: null,
  areaPrecision: null,
  religionEn: null,
  religionPt: null,
};

export interface EmpireAnswer {
  id: number;
  slug: string;
  nameEn: string;
  namePt: string;
  broadEra: number;
  mapBorderConfidence: number;
  continents: number[];
  primaryContinent: number;
  capitalEn: string;
  capitalPt: string;
  languageEn: string;
  languagePt: string;
  hints: EmpireHint[];
  referenceYear: number;
  referenceYearPrecision: number;
  startYear: number;
  startYearPrecision: number;
  endYear: number;
  endYearPrecision: number;
  durationNotesEn: string;
  durationNotesPt: string;
  peakAreaKm2: number;
  areaPrecision: number;
  religionEn: string;
  religionPt: string;
}

export interface GuessComparison {
  area: number;
  duration: number;
}

export interface GuessResponse {
  correct: boolean;
  gameOver: boolean;
  reveal: ChallengeReveal | null;
  answer: EmpireAnswer | null;
  comparison: GuessComparison | null;
}

export interface PlayerStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  // distribution[i] = games won on attempt i + 1.
  distribution: number[];
  todayResult: { correct: boolean; attempts: number } | null;
}

export interface CommunityStats {
  date: string;
  challengeNumber: number;
  attemptsAllowed: number;
  // Everyone who finished today's challenge, the player included.
  players: number;
  wins: number;
  averageAttempts: number | null;
  distribution: number[];
}

export interface StatsResponse {
  me: PlayerStats;
  today: CommunityStats;
}
