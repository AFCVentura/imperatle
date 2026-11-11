using Imperatle.Api.Game;
using Imperatle.Api.Models;

namespace Imperatle.Api.Tests;

public class RevealBuilderTests
{
    private static Empire Empire(
        int area = 1_000_000, int start = 100, int? end = 300, int peak = 200, string slug = "empire", string? shape = null) => new()
    {
        Slug = slug,
        ReferenceYear = peak,
        MapBorderConfidence = BorderConfidence.Approximate,
        Continents = [Continent.Asia],
        PrimaryContinents = [Continent.Asia],
        CapitalEn = "Capital",
        LanguageEn = "Language",
        ReligionEn = "Religion",
        StartYear = start,
        EndYear = end,
        PeakAreaKm2 = area,
        MapShape = shape,
        Hints =
        [
            new EmpireHint { Order = 2, TextEn = "third" },
            new EmpireHint { Order = 0, TextEn = "first", DetailsEn = "first, explained" },
            new EmpireHint { Order = 1, TextEn = "second" },
        ],
    };

    // A lon/lat rectangle as a one-polygon GeoJSON MultiPolygon.
    private static string Box(double west, double south, double east, double north) =>
        $"{{\"type\":\"MultiPolygon\",\"coordinates\":[[[[{west},{south}],[{east},{south}],[{east},{north}],[{west},{north}],[{west},{south}]]]]}}";

    // The explanations may name what a clue hides: only the answer, sent once
    // the round is over, carries them (and the summary).
    [Fact]
    public void Clue_explanations_and_the_summary_come_only_with_the_answer()
    {
        var empire = Empire();
        empire.SummaryEn = "What it was.";

        var answer = RevealBuilder.BuildAnswer(empire);
        Assert.Equal("first, explained", answer.Hints[0].DetailsEn);
        Assert.Equal("", answer.Hints[1].DetailsEn);
        Assert.Equal("What it was.", answer.SummaryEn);

        var json = System.Text.Json.JsonSerializer.Serialize(RevealBuilder.BuildReveal(empire, 6));
        Assert.DoesNotContain("explained", json);
        Assert.DoesNotContain("What it was", json);
    }

    [Fact]
    public void An_empire_that_still_exists_lasts_until_this_year()
    {
        var ongoing = Empire(start: 1776, end: null);

        Assert.Equal(DateTime.UtcNow.Year - 1776, RevealBuilder.DurationYears(ongoing));
        Assert.True(RevealBuilder.BuildAnswer(ongoing).Ongoing);
        Assert.Null(RevealBuilder.BuildAnswer(ongoing).EndYear);
        Assert.False(RevealBuilder.BuildAnswer(Empire()).Ongoing);
    }

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

    // One clue per wrong guess: 1 era, 2 map with continents, 3-5 the
    // curiosities, 6 map with countries. The map clues come from the map
    // stage, so the reveal only carries the era and the curiosities.
    [Fact]
    public void One_clue_per_wrong_guess()
    {
        var empire = Empire();

        var none = RevealBuilder.BuildReveal(empire, 0);
        Assert.Null(none.BroadEra);
        Assert.Null(none.Hints);

        var first = RevealBuilder.BuildReveal(empire, 1);
        Assert.Equal(BroadEra.Antiquity, first.BroadEra);
        Assert.Null(first.Hints);

        Assert.Null(RevealBuilder.BuildReveal(empire, 2).Hints);
        Assert.Equal(["first"], RevealBuilder.BuildReveal(empire, 3).Hints!.Select(h => h.TextEn));
        Assert.Equal(["first", "second"], RevealBuilder.BuildReveal(empire, 4).Hints!.Select(h => h.TextEn));
        Assert.Equal(["first", "second", "third"], RevealBuilder.BuildReveal(empire, 5).Hints!.Select(h => h.TextEn));
        Assert.Equal(["first", "second", "third"], RevealBuilder.BuildReveal(empire, 9).Hints!.Select(h => h.TextEn));
    }

    // Capital, language, religion, dates and area wait for the answer's sheet.
    [Fact]
    public void Sheet_facts_never_come_mid_round()
    {
        var reveal = RevealBuilder.BuildReveal(Empire(), 6);
        Assert.Null(reveal.CapitalEn);
        Assert.Null(reveal.LanguageEn);
        Assert.Null(reveal.ReligionEn);
        Assert.Null(reveal.Continents);
        Assert.Null(reveal.ReferenceYear);
        Assert.Null(reveal.StartYear);
        Assert.Null(reveal.PeakAreaKm2);
        // A caveat about the map, known from the start.
        Assert.Equal(BorderConfidence.Approximate, reveal.MapBorderConfidence);
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

    // Era: Bigger = the answer is more recent. Same era when they were
    // contemporaries at their peaks, or the peaks are 25 years apart or less.
    [Fact]
    public void Era_comparison_by_peaks_and_contemporaries()
    {
        var safavid = Empire(start: 1501, end: 1736, peak: 1629);
        var mughal = Empire(start: 1526, end: 1857, peak: 1700);
        var roman = Empire(start: -27, end: 476, peak: 117);
        var shortLived = Empire(start: 1640, end: 1650, peak: 1645);

        Assert.Equal(ComparisonResult.Approximate, RevealBuilder.CompareEra(mughal, safavid));
        Assert.Equal(ComparisonResult.Bigger, RevealBuilder.CompareEra(roman, safavid));
        Assert.Equal(ComparisonResult.Smaller, RevealBuilder.CompareEra(safavid, roman));
        // Not contemporaries (the short one was gone by 1700), peaks 55 years apart.
        Assert.Equal(ComparisonResult.Bigger, RevealBuilder.CompareEra(shortLived, mughal));
        // Peaks 16 years apart: same era even though each missed the other's peak.
        Assert.Equal(ComparisonResult.Approximate, RevealBuilder.CompareEra(Empire(start: 1640, end: 1650, peak: 1645), Empire(start: 1655, end: 1700, peak: 1661)));
        Assert.Equal(ComparisonResult.Approximate, RevealBuilder.BuildComparison(mughal, safavid).Era);
    }

    [Fact]
    public void Overlapping_maps_share_a_part_of_both_together()
    {
        // Two 10° squares on the equator, overlapping by half: shared 5 out of 15.
        var comparison = RevealBuilder.BuildComparison(
            Empire(slug: "a1", shape: Box(0, 0, 10, 10)),
            Empire(slug: "b1", shape: Box(5, 0, 15, 10)));
        Assert.InRange(comparison.Shared!.Value, 0.32, 0.35);
        Assert.Null(comparison.DistanceKm);
        Assert.InRange(comparison.BearingDegrees!.Value, 85, 95);

        var same = RevealBuilder.BuildComparison(Empire(slug: "a2", shape: Box(0, 0, 10, 10)), Empire(slug: "b2", shape: Box(0, 0, 10, 10)));
        Assert.InRange(same.Shared!.Value, 0.999, 1);
    }

    [Fact]
    public void Apart_maps_give_the_distance_between_borders_and_the_direction()
    {
        // 10° of longitude apart, guess to the west of the answer. Closest
        // at their northern corners (10°N), where 10° is about 1,095 km.
        var comparison = RevealBuilder.BuildComparison(
            Empire(slug: "a3", shape: Box(0, 0, 10, 10)),
            Empire(slug: "b3", shape: Box(20, 0, 30, 10)));
        Assert.Equal(0, comparison.Shared);
        Assert.InRange(comparison.DistanceKm!.Value, 1085, 1105);
        Assert.InRange(comparison.BearingDegrees!.Value, 80, 100);

        var north = RevealBuilder.BuildComparison(
            Empire(slug: "a4", shape: Box(0, 0, 10, 10)),
            Empire(slug: "b4", shape: Box(0, 40, 10, 50)));
        Assert.True(north.BearingDegrees < 10 || north.BearingDegrees > 350);
    }

    // Shapes crossing the date line keep longitudes past 180.
    [Fact]
    public void Overlap_is_found_across_the_date_line()
    {
        var comparison = RevealBuilder.BuildComparison(
            Empire(slug: "a5", shape: Box(175, 0, 185, 10)),
            Empire(slug: "b5", shape: Box(-180, 0, -170, 10)));
        Assert.InRange(comparison.Shared!.Value, 0.32, 0.35);
    }

    // The middles go along (degrees), for the flat map's arrow; and whether
    // either side is marked spread out.
    [Fact]
    public void Comparison_carries_the_middles_and_the_spread_marks()
    {
        var guess = Empire(slug: "a7", shape: Box(0, 0, 10, 10));
        var answer = Empire(slug: "b7", shape: Box(20, 0, 30, 10));
        answer.Spread = true;

        var comparison = RevealBuilder.BuildComparison(guess, answer);
        Assert.Equal(5, comparison.GuessCentre![0], 0.5);
        Assert.Equal(5, comparison.GuessCentre[1], 0.5);
        Assert.Equal(25, comparison.AnswerCentre![0], 0.5);
        Assert.True(comparison.AnswerSpread);
        Assert.False(comparison.GuessSpread);
    }

    [Fact]
    public void Without_a_map_there_is_no_proximity()
    {
        var comparison = RevealBuilder.BuildComparison(Empire(slug: "a6"), Empire(slug: "b6", shape: Box(0, 0, 1, 1)));
        Assert.Null(comparison.Shared);
        Assert.Null(comparison.DistanceKm);
        Assert.Null(comparison.BearingDegrees);
    }
}
