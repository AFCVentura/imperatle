using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

// Full reveal, sent once the round is over (correct guess or attempts exhausted).
public record EmpireAnswer(
    int Id,
    string Slug,
    string NameEn,
    string NamePt,
    string NameEs,
    BroadEra BroadEra,
    BorderConfidence MapBorderConfidence,
    List<Continent> Continents,
    List<Continent> PrimaryContinents,
    string CapitalEn,
    string CapitalPt,
    string CapitalEs,
    string LanguageEn,
    string LanguagePt,
    string LanguageEs,
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
    string DurationNotesEs,
    int PeakAreaKm2,
    AreaPrecision AreaPrecision,
    string ReligionEn,
    string ReligionPt,
    string ReligionEs,
    string ReligionNotesEn,
    string ReligionNotesPt,
    string ReligionNotesEs,
    string WikipediaEn,
    string WikipediaPt,
    string WikipediaEs,
    string SummaryEn,
    string SummaryPt,
    string SummaryEs
);
