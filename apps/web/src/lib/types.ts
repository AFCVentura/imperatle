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
  // Whether getMapShape(date) has a shape to draw; false while the empire has
  // no map yet.
  hasMap: boolean;
  // How exact the map's borders are (BORDER_CONFIDENCES index), shown on the
  // map from the start.
  mapBorderConfidence?: number | null;
}

// The *Es (Spanish) fields are optional everywhere: answers and guesses saved
// before Spanish existed don't have them, and pickLocalized falls back to
// English when they're missing.
export interface EmpireSummary {
  id: number;
  nameEn: string;
  namePt: string;
  nameEs?: string;
  // Other names the search also matches (spellings, other languages, "China"
  // for a Chinese dynasty).
  aliases: string[];
  // The empire's public page: /{locale}/empires/{slug}.
  slug: string;
}

export interface EmpireHint {
  textEn: string;
  textPt: string;
  textEs?: string;
  // Only in the answer, once the round is over: a longer explanation of the
  // clue. Empty when there's none; missing from answers saved before it existed.
  detailsEn?: string;
  detailsPt?: string;
  detailsEs?: string;
}

// Cumulative reveal for the current attempt count -- every field stays null
// until its stage is reached, then stays populated for the rest of the round.
export interface ChallengeReveal {
  broadEra: number | null;
  mapBorderConfidence: number | null;
  continents: number[] | null;
  // One, or two when the territory was split about evenly between them.
  primaryContinents: number[] | null;
  capitalEn: string | null;
  capitalPt: string | null;
  capitalEs?: string | null;
  languageEn: string | null;
  languagePt: string | null;
  languageEs?: string | null;
  hints: EmpireHint[] | null;
  referenceYear: number | null;
  referenceYearPrecision: number | null;
  startYear: number | null;
  startYearPrecision: number | null;
  endYear: number | null;
  endYearPrecision: number | null;
  // With the period: true when the empire still exists (endYear stays null).
  ongoing: boolean | null;
  durationNotesEn: string | null;
  durationNotesPt: string | null;
  durationNotesEs?: string | null;
  peakAreaKm2: number | null;
  areaPrecision: number | null;
  religionEn: string | null;
  religionPt: string | null;
  religionEs?: string | null;
  religionNotesEn: string | null;
  religionNotesPt: string | null;
  religionNotesEs?: string | null;
}

// All-locked placeholder shown before the player's first guess -- lets the
// hint board render every row/card from the start instead of appearing as
// guesses come in.
export const EMPTY_REVEAL: ChallengeReveal = {
  broadEra: null,
  mapBorderConfidence: null,
  continents: null,
  primaryContinents: null,
  capitalEn: null,
  capitalPt: null,
  capitalEs: null,
  languageEn: null,
  languagePt: null,
  languageEs: null,
  hints: null,
  referenceYear: null,
  referenceYearPrecision: null,
  startYear: null,
  startYearPrecision: null,
  endYear: null,
  endYearPrecision: null,
  ongoing: null,
  durationNotesEn: null,
  durationNotesPt: null,
  durationNotesEs: null,
  peakAreaKm2: null,
  areaPrecision: null,
  religionEn: null,
  religionPt: null,
  religionEs: null,
  religionNotesEn: null,
  religionNotesPt: null,
  religionNotesEs: null,
};

export interface EmpireAnswer {
  id: number;
  slug: string;
  nameEn: string;
  namePt: string;
  nameEs?: string;
  broadEra: number;
  mapBorderConfidence: number;
  continents: number[];
  primaryContinents: number[];
  capitalEn: string;
  capitalPt: string;
  capitalEs?: string;
  languageEn: string;
  languagePt: string;
  languageEs?: string;
  hints: EmpireHint[];
  referenceYear: number;
  referenceYearPrecision: number;
  startYear: number;
  startYearPrecision: number;
  endYear: number | null; // null = still exists
  endYearPrecision: number | null;
  ongoing: boolean;
  durationNotesEn: string;
  durationNotesPt: string;
  durationNotesEs?: string;
  peakAreaKm2: number;
  areaPrecision: number;
  religionEn: string;
  religionPt: string;
  religionEs?: string;
  religionNotesEn: string;
  religionNotesPt: string;
  religionNotesEs?: string;
  // Empty when the empire has no link. Missing from answers saved before the
  // field existed.
  wikipediaEn?: string;
  wikipediaPt?: string;
  wikipediaEs?: string;
  // What the empire was, in a few sentences. Empty when there's none yet;
  // missing from answers saved before the field existed.
  summaryEn?: string;
  summaryPt?: string;
  summaryEs?: string;
}

// How the answer compares with a wrong guess (COMPARISON_RESULTS indexes):
// area at the peak, and era (Bigger = the answer is more recent). Shared
// (0-1), distanceKm and bearingDegrees say where the answer is from the
// guess; null when either has no map.
export interface GuessComparison {
  area: number;
  era: number;
  shared?: number | null;
  distanceKm?: number | null;
  bearingDegrees?: number | null;
  // How much of the answer lies inside the guess, and the other way (0-1).
  answerCovered?: number | null;
  guessCovered?: number | null;
  // [longitude, latitude] of each middle, for the flat map's arrow.
  guessCentre?: [number, number] | null;
  answerCentre?: [number, number] | null;
  // Spread-out territory (colonial empires): no arrow to or from it.
  answerSpread?: boolean;
  guessSpread?: boolean;
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

// --- Supporter perks (apps/api/Dtos/ArchiveDtos.cs, PracticeDtos.cs) ---

export type ArchiveStatus = "NotPlayed" | "InProgress" | "Won" | "Lost";

export interface ArchiveDay {
  date: string;
  challengeNumber: number;
  status: ArchiveStatus;
  attemptsUsed: number;
}

export interface ArchiveList {
  today: string;
  attemptsAllowed: number;
  // Newest first, only days before today.
  days: ArchiveDay[];
}

// One past day with the player's progress on it (kept by the server).
export interface ArchiveChallenge {
  date: string;
  challengeNumber: number;
  attemptsAllowed: number;
  hasMap: boolean;
  attemptsUsed: number;
  completed: boolean;
  correct: boolean;
  reveal: ChallengeReveal | null;
  answer: EmpireAnswer | null;
  guesses: PlayedGuess[];
  mapBorderConfidence?: number | null;
}

// A guess already made in a round, as the server stored it (so another
// device can rebuild the board). Comparison is null for the correct guess.
export interface PlayedGuess {
  empireId: number;
  nameEn: string;
  namePt: string;
  nameEs?: string;
  correct: boolean;
  comparison: GuessComparison | null;
}

// GET /challenges/today/progress: the player's own game today (the account's
// when signed in).
export interface ChallengeProgress {
  date: string;
  attemptsUsed: number;
  completed: boolean;
  correct: boolean;
  guesses: PlayedGuess[];
  reveal: ChallengeReveal | null;
  answer: EmpireAnswer | null;
}

export const PRACTICE_DIFFICULTIES = ["Any", "Easy", "Medium", "Hard"] as const;
export type PracticeDifficulty = (typeof PRACTICE_DIFFICULTIES)[number];

export const PRACTICE_MAP_MODES = ["Progressive", "Full", "Outline"] as const;
export type PracticeMapMode = (typeof PRACTICE_MAP_MODES)[number];

// Same limits as the API (PracticeRules).
export const PRACTICE_MIN_ATTEMPTS = 3;
export const PRACTICE_MAX_ATTEMPTS = 10;

// Eras and continents are indexes into BROAD_ERAS and CONTINENTS, like every
// other game enum (empty = any; several = any of them); difficulty and map
// travel as names.
export interface PracticeOptions {
  difficulty: PracticeDifficulty;
  attempts: number;
  hints: boolean;
  map: PracticeMapMode;
  eras: number[];
  continents: number[];
  // The clues spread over the attempts (lib/clues, clueStep).
  adaptiveHints: boolean;
}

export const DEFAULT_PRACTICE_OPTIONS: PracticeOptions = {
  difficulty: "Any",
  attempts: 7,
  hints: true,
  map: "Progressive",
  eras: [],
  continents: [],
  adaptiveHints: true,
};

export interface PracticeSession {
  id: string;
  options: PracticeOptions;
  hasMap: boolean;
  attemptsUsed: number;
  completed: boolean;
  correct: boolean;
  reveal: ChallengeReveal | null;
  answer: EmpireAnswer | null;
  mapBorderConfidence?: number | null;
}
