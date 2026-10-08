using Imperatle.Api.Dtos;
using Imperatle.Api.Models;

namespace Imperatle.Api.Game;

public static class RevealBuilder
{
    // Boundary picked as 1492 (Age of Discovery) over the doc's other candidate,
    // 1453 (fall of Constantinople) -- easy to flip later, low-stakes content call.
    public static BroadEra ComputeBroadEra(int referenceYear) => referenceYear switch
    {
        < 476 => BroadEra.Antiquity,
        < 1492 => BroadEra.MiddleAges,
        < 1789 => BroadEra.Modern,
        _ => BroadEra.Contemporary,
    };

    // Cumulative reveal for the given wrong-guess count, per the hint-progression table.
    public static ChallengeReveal BuildReveal(Empire empire, int attemptNumber)
    {
        var hintCount = attemptNumber switch
        {
            >= 6 => 3,
            >= 5 => 2,
            >= 4 => 1,
            _ => 0,
        };

        return new ChallengeReveal(
            BroadEra: attemptNumber >= 1 ? ComputeBroadEra(empire.ReferenceYear) : null,
            MapBorderConfidence: attemptNumber >= 1 ? empire.MapBorderConfidence : null,
            Continents: attemptNumber >= 2 ? empire.Continents : null,
            PrimaryContinent: attemptNumber >= 2 ? empire.PrimaryContinent : null,
            CapitalEn: attemptNumber >= 3 ? empire.CapitalEn : null,
            CapitalPt: attemptNumber >= 3 ? empire.CapitalPt : null,
            LanguageEn: attemptNumber >= 4 ? empire.LanguageEn : null,
            LanguagePt: attemptNumber >= 4 ? empire.LanguagePt : null,
            Hints: hintCount > 0 ? empire.Hints.OrderBy(h => h.Order).Take(hintCount).Select(ToDto).ToList() : null,
            ReferenceYear: attemptNumber >= 5 ? empire.ReferenceYear : null,
            ReferenceYearPrecision: attemptNumber >= 5 ? empire.ReferenceYearPrecision : null,
            StartYear: attemptNumber >= 6 ? empire.StartYear : null,
            StartYearPrecision: attemptNumber >= 6 ? empire.StartYearPrecision : null,
            EndYear: attemptNumber >= 6 ? empire.EndYear : null,
            EndYearPrecision: attemptNumber >= 6 ? empire.EndYearPrecision : null,
            DurationNotesEn: attemptNumber >= 6 ? empire.DurationNotesEn : null,
            DurationNotesPt: attemptNumber >= 6 ? empire.DurationNotesPt : null,
            PeakAreaKm2: attemptNumber >= 6 ? empire.PeakAreaKm2 : null,
            AreaPrecision: attemptNumber >= 6 ? empire.AreaPrecision : null,
            ReligionEn: attemptNumber >= 6 ? empire.ReligionEn : null,
            ReligionPt: attemptNumber >= 6 ? empire.ReligionPt : null,
            ReligionNotesEn: attemptNumber >= 6 ? empire.ReligionNotesEn : null,
            ReligionNotesPt: attemptNumber >= 6 ? empire.ReligionNotesPt : null
        );
    }

    // Per-guess directional feedback (shown immediately on the guess card,
    // independent of the hint-stage table above).
    public static GuessComparison BuildComparison(Empire guessedEmpire, Empire correctEmpire) => new(
        Compare(guessedEmpire.PeakAreaKm2, correctEmpire.PeakAreaKm2, GameRules.AreaApproximateToleranceRatio),
        Compare(guessedEmpire.EndYear - guessedEmpire.StartYear, correctEmpire.EndYear - correctEmpire.StartYear, GameRules.DurationApproximateToleranceRatio));

    private static ComparisonResult Compare(double guessedValue, double correctValue, double toleranceRatio)
    {
        if (guessedValue == 0) return correctValue == 0 ? ComparisonResult.Approximate : ComparisonResult.Bigger;
        var relativeDiff = Math.Abs(correctValue - guessedValue) / Math.Abs(guessedValue);
        if (relativeDiff <= toleranceRatio) return ComparisonResult.Approximate;
        return correctValue > guessedValue ? ComparisonResult.Bigger : ComparisonResult.Smaller;
    }

    public static EmpireAnswer BuildAnswer(Empire empire) => new(
        empire.Id,
        empire.Slug,
        empire.NameEn,
        empire.NamePt,
        ComputeBroadEra(empire.ReferenceYear),
        empire.MapBorderConfidence,
        empire.Continents,
        empire.PrimaryContinent,
        empire.CapitalEn,
        empire.CapitalPt,
        empire.LanguageEn,
        empire.LanguagePt,
        empire.Hints.OrderBy(h => h.Order).Select(ToDto).ToList(),
        empire.ReferenceYear,
        empire.ReferenceYearPrecision,
        empire.StartYear,
        empire.StartYearPrecision,
        empire.EndYear,
        empire.EndYearPrecision,
        empire.DurationNotesEn,
        empire.DurationNotesPt,
        empire.PeakAreaKm2,
        empire.AreaPrecision,
        empire.ReligionEn,
        empire.ReligionPt,
        empire.ReligionNotesEn,
        empire.ReligionNotesPt);

    private static EmpireHintDto ToDto(EmpireHint hint) => new(hint.TextEn, hint.TextPt);
}
