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
    List<Continent> PrimaryContinents,
    string CapitalEn,
    string CapitalPt,
    string LanguageEn,
    string LanguagePt,
    List<EmpireHintAnswerDto> Hints,
    int ReferenceYear,
    YearPrecision ReferenceYearPrecision,
    int StartYear,
    YearPrecision StartYearPrecision,
    int? EndYear, // null = still exists
    YearPrecision? EndYearPrecision,
    bool Ongoing,
    string DurationNotesEn,
    string DurationNotesPt,
    int PeakAreaKm2,
    AreaPrecision AreaPrecision,
    string ReligionEn,
    string ReligionPt,
    string ReligionNotesEn,
    string ReligionNotesPt,
    string WikipediaEn,
    string WikipediaPt,
    string SummaryEn,
    string SummaryPt
);
