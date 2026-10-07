using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

// Full reveal, sent once the round is over (correct guess or attempts exhausted).
public record EmpireAnswer(
    int Id,
    string Slug,
    string NameEn,
    string NamePt,
    BroadEra BroadEra,
    BorderConfidence MapBorderConfidence,
    List<Continent> Continents,
    Continent PrimaryContinent,
    string CapitalEn,
    string CapitalPt,
    string LanguageEn,
    string LanguagePt,
    List<EmpireHintDto> Hints,
    int ReferenceYear,
    YearPrecision ReferenceYearPrecision,
    int StartYear,
    YearPrecision StartYearPrecision,
    int EndYear,
    YearPrecision EndYearPrecision,
    string DurationNotesEn,
    string DurationNotesPt,
    int PeakAreaKm2,
    AreaPrecision AreaPrecision,
    string ReligionEn,
    string ReligionPt
);
