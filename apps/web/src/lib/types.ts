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

export interface TodayChallenge {
  date: string;
  attemptsAllowed: number;
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
  subEraEn: string | null;
  subEraPt: string | null;
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
  religionEn: string | null;
  religionPt: string | null;
}

export interface EmpireAnswer {
  id: number;
  slug: string;
  nameEn: string;
  namePt: string;
  broadEra: number;
  mapBorderConfidence: number;
  continents: number[];
  primaryContinent: number;
  subEraEn: string;
  subEraPt: string;
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
  religionEn: string;
  religionPt: string;
}

export interface GuessResponse {
  correct: boolean;
  gameOver: boolean;
  reveal: ChallengeReveal | null;
  answer: EmpireAnswer | null;
}
