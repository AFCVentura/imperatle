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

    // Cumulative reveal for the given wrong-guess count: one clue per wrong
    // guess (GameRules.ClueOrder). The map's continents and countries come
    // from the map stage (web: map/stage.ts), so here only the era and the
    // curiosities. Capital, language, religion, dates and area wait for the
    // answer's sheet at the end. The map's border confidence is known from
    // the start (it's a caveat about the map, not a clue).
    public static ChallengeReveal BuildReveal(Empire empire, int attemptNumber)
    {
        var hintCount = GameRules.CuriositiesAfter(attemptNumber);

        return new ChallengeReveal(
            BroadEra: attemptNumber >= GameRules.EraClueAt ? ComputeBroadEra(empire.ReferenceYear) : null,
            MapBorderConfidence: empire.MapBorderConfidence,
            Continents: null,
            PrimaryContinents: null,
            CapitalEn: null,
            CapitalPt: null,
            CapitalEs: null,
            LanguageEn: null,
            LanguagePt: null,
            LanguageEs: null,
            Hints: hintCount > 0 ? empire.Hints.OrderBy(h => h.Order).Take(hintCount).Select(ToDto).ToList() : null,
            ReferenceYear: null,
            ReferenceYearPrecision: null,
            StartYear: null,
            StartYearPrecision: null,
            EndYear: null,
            EndYearPrecision: null,
            Ongoing: null,
            DurationNotesEn: null,
            DurationNotesPt: null,
            DurationNotesEs: null,
            PeakAreaKm2: null,
            AreaPrecision: null,
            ReligionEn: null,
            ReligionPt: null,
            ReligionEs: null,
            ReligionNotesEn: null,
            ReligionNotesPt: null,
            ReligionNotesEs: null
        );
    }

    // Per-guess feedback (shown right away on the guess, independent of the
    // clue table above).
    public static GuessComparison BuildComparison(Empire guessedEmpire, Empire correctEmpire)
    {
        var proximity = EmpireGeometry.Compare(guessedEmpire.Slug, guessedEmpire.MapShape, correctEmpire.Slug, correctEmpire.MapShape);
        return new GuessComparison(
            Compare(guessedEmpire.PeakAreaKm2, correctEmpire.PeakAreaKm2, GameRules.AreaApproximateToleranceRatio),
            CompareEra(guessedEmpire, correctEmpire),
            proximity?.Shared,
            proximity?.DistanceKm,
            proximity?.BearingDegrees,
            proximity is null ? null : Math.Round(proximity.AnswerCovered, 3),
            proximity is null ? null : Math.Round(proximity.GuessCovered, 3),
            proximity?.GuessCentre,
            proximity?.AnswerCentre,
            correctEmpire.Spread,
            guessedEmpire.Spread);
    }

    // "Same era" when the two were contemporaries at their peaks (each one
    // still existed in the other's peak year) or the peaks are close anyway;
    // otherwise Bigger = the answer's peak came later (more recent).
    public static ComparisonResult CompareEra(Empire guessed, Empire correct)
    {
        static bool Alive(Empire e, int year) => e.StartYear <= year && year <= (e.EndYear ?? int.MaxValue);

        var contemporaries = Alive(guessed, correct.ReferenceYear) && Alive(correct, guessed.ReferenceYear);
        if (contemporaries || Math.Abs(correct.ReferenceYear - guessed.ReferenceYear) <= GameRules.EraApproximateYears)
        {
            return ComparisonResult.Approximate;
        }

        return correct.ReferenceYear > guessed.ReferenceYear ? ComparisonResult.Bigger : ComparisonResult.Smaller;
    }

    // An empire that still exists lasts until the current year.
    public static int DurationYears(Empire empire) => (empire.EndYear ?? DateTime.UtcNow.Year) - empire.StartYear;

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
        empire.NameEs,
        ComputeBroadEra(empire.ReferenceYear),
        empire.MapBorderConfidence,
        empire.Continents,
        empire.PrimaryContinents,
        empire.CapitalEn,
        empire.CapitalPt,
        empire.CapitalEs,
        empire.LanguageEn,
        empire.LanguagePt,
        empire.LanguageEs,
        empire.Hints.OrderBy(h => h.Order).Select(ToAnswerDto).ToList(),
        empire.ReferenceYear,
        empire.ReferenceYearPrecision,
        empire.StartYear,
        empire.StartYearPrecision,
        empire.EndYear,
        empire.EndYearPrecision,
        empire.EndYear is null,
        empire.DurationNotesEn,
        empire.DurationNotesPt,
        empire.DurationNotesEs,
        empire.PeakAreaKm2,
        empire.AreaPrecision,
        empire.ReligionEn,
        empire.ReligionPt,
        empire.ReligionEs,
        empire.ReligionNotesEn,
        empire.ReligionNotesPt,
        empire.ReligionNotesEs,
        empire.WikipediaEn,
        empire.WikipediaPt,
        empire.WikipediaEs,
        empire.SummaryEn,
        empire.SummaryPt,
        empire.SummaryEs);

    private static EmpireHintDto ToDto(EmpireHint hint) => new(hint.TextEn, hint.TextPt, hint.TextEs);

    private static EmpireHintAnswerDto ToAnswerDto(EmpireHint hint) => new(hint.TextEn, hint.TextPt, hint.TextEs, hint.DetailsEn, hint.DetailsPt, hint.DetailsEs);
}
