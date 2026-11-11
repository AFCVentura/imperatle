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
    string? CapitalEs,
    string? LanguageEn,
    string? LanguagePt,
    string? LanguageEs,
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
    string? DurationNotesEs,
    int? PeakAreaKm2,
    AreaPrecision? AreaPrecision,
    string? ReligionEn,
    string? ReligionPt,
    string? ReligionEs,
    string? ReligionNotesEn,
    string? ReligionNotesPt,
    string? ReligionNotesEs
);

public record EmpireHintDto(string TextEn, string TextPt, string TextEs);

// A clue in the full answer, with its explanation (empty = none). Kept apart
// from EmpireHintDto so a reveal mid-round can't carry the explanations.
public record EmpireHintAnswerDto(string TextEn, string TextPt, string TextEs, string DetailsEn, string DetailsPt, string DetailsEs);
