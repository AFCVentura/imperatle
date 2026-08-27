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
            SubEraEn: attemptNumber >= 3 ? empire.SubEraEn : null,
            SubEraPt: attemptNumber >= 3 ? empire.SubEraPt : null,
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
            ReligionEn: attemptNumber >= 6 ? empire.ReligionEn : null,
            ReligionPt: attemptNumber >= 6 ? empire.ReligionPt : null
        );
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
        empire.SubEraEn,
        empire.SubEraPt,
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
        empire.ReligionEn,
        empire.ReligionPt);

    private static EmpireHintDto ToDto(EmpireHint hint) => new(hint.TextEn, hint.TextPt);
}
