using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

// Cumulative "abaixo do mapa" data unlocked so far, staged by wrong-guess count.
// Every field is nullable/empty until its stage is reached; already-unlocked
// fields from earlier stages stay populated (this is not a per-stage delta).
public record ChallengeReveal(
    BroadEra? BroadEra,
    BorderConfidence? MapBorderConfidence,
    List<Continent>? Continents,
    List<Continent>? PrimaryContinents,
    string? CapitalEn,
    string? CapitalPt,
    string? LanguageEn,
    string? LanguagePt,
    List<EmpireHintDto>? Hints,
    int? ReferenceYear,
    YearPrecision? ReferenceYearPrecision,
    int? StartYear,
    YearPrecision? StartYearPrecision,
    int? EndYear,
    YearPrecision? EndYearPrecision,
    // With the period: true when the empire still exists (and EndYear is null).
    bool? Ongoing,
    string? DurationNotesEn,
    string? DurationNotesPt,
    int? PeakAreaKm2,
    AreaPrecision? AreaPrecision,
    string? ReligionEn,
    string? ReligionPt,
    string? ReligionNotesEn,
    string? ReligionNotesPt
);

public record EmpireHintDto(string TextEn, string TextPt);

// A clue in the full answer, with its explanation (empty = none). Kept apart
// from EmpireHintDto so a reveal mid-round can't carry the explanations.
public record EmpireHintAnswerDto(string TextEn, string TextPt, string DetailsEn, string DetailsPt);
