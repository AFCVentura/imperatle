using Imperatle.Api.Data;
using Imperatle.Api.Game;

namespace Imperatle.Api.Tests;

// The real shapes, against the numbers reviewed on the hint redesign mockup
// (computed there with d3-geo and polygon-clipping in the browser).
public class EmpireGeometryTests
{
    private static string Shape(string slug) =>
        File.ReadAllText(Path.Combine(EmpireContentLoader.DefaultDirectory, "..", "shapes", $"{slug}.json"));

    private static Proximity Compare(string guess, string answer) =>
        EmpireGeometry.Compare(guess, Shape(guess), answer, Shape(answer))!;

    [Theory]
    [InlineData("ilkhanate", 0.66, 0.76)]
    [InlineData("timurid-empire", 0.49, 0.59)]
    [InlineData("sasanian-empire", 0.50, 0.60)]
    [InlineData("achaemenid-empire", 0.43, 0.53)]
    [InlineData("ottoman-empire", 0.01, 0.06)]
    public void Shared_part_matches_the_mockup(string guess, double min, double max)
    {
        Assert.InRange(Compare(guess, "safavid-empire").Shared, min, max);
    }

    [Fact]
    public void Neighbours_are_close_and_far_ones_get_a_distance()
    {
        var mughal = Compare("mughal-empire", "safavid-empire");
        Assert.Equal(0, mughal.Shared);
        Assert.InRange(mughal.DistanceKm!.Value, 0, 50);

        // The Safavids are south-east of Rome's peak territory... by its middle.
        var roman = Compare("roman-empire", "safavid-empire");
        Assert.True(roman.Shared > 0 || roman.DistanceKm > 0);
        Assert.InRange(roman.BearingDegrees, 45, 135);
    }

    // One territory almost inside the other: a small share of both together,
    // but nearly all of the smaller one is covered.
    [Fact]
    public void An_empire_inside_another_is_covered_both_ways()
    {
        var xiongnuInMongol = Compare("mongol-empire", "xiongnu");
        Assert.True(xiongnuInMongol.Shared < 0.3);
        Assert.InRange(xiongnuInMongol.AnswerCovered, 0.9, 1);

        var mongolAroundXiongnu = Compare("xiongnu", "mongol-empire");
        Assert.InRange(mongolAroundXiongnu.GuessCovered, 0.9, 1);
        Assert.True(mongolAroundXiongnu.AnswerCovered < 0.3);
    }

    // Spread over every ocean: it has to come out whole, quickly enough.
    [Fact]
    public void British_empire_compares_with_anything()
    {
        var british = Compare("british-empire", "mughal-empire");
        Assert.InRange(british.Shared, 0.01, 1);
        var reverse = Compare("roman-empire", "british-empire");
        Assert.InRange(reverse.Shared, 0, 1);
    }
}
