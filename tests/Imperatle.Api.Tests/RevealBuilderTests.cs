using Imperatle.Api.Game;
using Imperatle.Api.Models;

namespace Imperatle.Api.Tests;

public class RevealBuilderTests
{
    private static Empire Empire(int area = 1_000_000, int start = 100, int end = 300) => new()
    {
        ReferenceYear = 200,
        Continents = [Continent.Asia],
        PrimaryContinent = Continent.Asia,
        CapitalEn = "Capital",
        LanguageEn = "Language",
        ReligionEn = "Religion",
        StartYear = start,
        EndYear = end,
        PeakAreaKm2 = area,
        Hints =
        [
            new EmpireHint { Order = 2, TextEn = "third" },
            new EmpireHint { Order = 0, TextEn = "first" },
            new EmpireHint { Order = 1, TextEn = "second" },
        ],
    };

    [Theory]
    [InlineData(475, BroadEra.Antiquity)]
    [InlineData(476, BroadEra.MiddleAges)]
    [InlineData(1491, BroadEra.MiddleAges)]
    [InlineData(1492, BroadEra.Modern)]
    [InlineData(1789, BroadEra.Contemporary)]
    [InlineData(-500, BroadEra.Antiquity)]
    public void Era_comes_from_the_peak_year(int year, BroadEra expected)
    {
        Assert.Equal(expected, RevealBuilder.ComputeBroadEra(year));
    }

    [Fact]
    public void Clues_unlock_attempt_by_attempt()
    {
        var empire = Empire();

        var first = RevealBuilder.BuildReveal(empire, 1);
        Assert.NotNull(first.BroadEra);
        Assert.Null(first.Continents);

        var second = RevealBuilder.BuildReveal(empire, 2);
        Assert.NotNull(second.Continents);
        Assert.Null(second.CapitalEn);

        var third = RevealBuilder.BuildReveal(empire, 3);
        Assert.Equal("Capital", third.CapitalEn);
        Assert.Null(third.LanguageEn);
        Assert.Null(third.Hints);

        var fourth = RevealBuilder.BuildReveal(empire, 4);
        Assert.Equal("Language", fourth.LanguageEn);
        Assert.Equal(["first"], fourth.Hints!.Select(h => h.TextEn));
        Assert.Null(fourth.ReferenceYear);

        var fifth = RevealBuilder.BuildReveal(empire, 5);
        Assert.Equal(200, fifth.ReferenceYear);
        Assert.Equal(["first", "second"], fifth.Hints!.Select(h => h.TextEn));
        Assert.Null(fifth.StartYear);

        var sixth = RevealBuilder.BuildReveal(empire, 6);
        Assert.Equal(100, sixth.StartYear);
        Assert.Equal(1_000_000, sixth.PeakAreaKm2);
        Assert.Equal("Religion", sixth.ReligionEn);
        Assert.Equal(["first", "second", "third"], sixth.Hints!.Select(h => h.TextEn));
    }

    [Theory]
    [InlineData(1_000_000, 2_000_000, ComparisonResult.Bigger)]
    [InlineData(1_000_000, 500_000, ComparisonResult.Smaller)]
    [InlineData(1_000_000, 1_100_000, ComparisonResult.Approximate)]
    [InlineData(1_000_000, 900_000, ComparisonResult.Approximate)]
    [InlineData(1_000_000, 1_110_000, ComparisonResult.Bigger)]
    public void Area_comparison_says_how_the_answer_compares_to_the_guess(int guessed, int answer, ComparisonResult expected)
    {
        var comparison = RevealBuilder.BuildComparison(Empire(area: guessed), Empire(area: answer));
        Assert.Equal(expected, comparison.Area);
    }

    [Fact]
    public void Duration_comparison_uses_the_lifespan()
    {
        // Guess lasted 200 years, the answer 400.
        var comparison = RevealBuilder.BuildComparison(Empire(start: 100, end: 300), Empire(start: -100, end: 300));
        Assert.Equal(ComparisonResult.Bigger, comparison.Duration);
    }
}
