using Imperatle.Api.Data;
using Imperatle.Api.Models;

namespace Imperatle.Api.Tests;

public class EmpireContentTests
{
    private static EmpireContent ValidEmpire(string slug = "test-empire", string name = "Test Empire") => new(
        Slug: slug,
        Name: new(name, name + " PT"),
        Peak: new(100, YearPrecision.Exact),
        Start: new(-50, YearPrecision.Approximate),
        End: new(300, YearPrecision.Century),
        Area: new(1_000_000, AreaPrecision.Approximate),
        MapAccuracy: BorderConfidence.Approximate,
        Continents: [Continent.Europe, Continent.Asia],
        PrimaryContinent: Continent.Europe,
        Capital: new("Capital", "Capital"),
        Language: new("Language", "Língua"),
        Religion: new("Religion", "Religião"),
        Curiosities: [new("One.", "Um."), new("Two.", "Dois."), new("Three.", "Três.")]);

    [Fact]
    public void A_valid_empire_has_no_errors()
    {
        Assert.Empty(EmpireContentLoader.Validate(ValidEmpire(), "test-empire"));
    }

    public static TheoryData<EmpireContent, string> InvalidEmpires => new()
    {
        { ValidEmpire() with { Slug = "Test_Empire" }, "lowercase" },
        { ValidEmpire(), "must match the file name" },
        { ValidEmpire() with { Peak = new(0, YearPrecision.Exact) }, "no year 0" },
        { ValidEmpire() with { Start = new(400, YearPrecision.Exact) }, "start.year must not be after" },
        { ValidEmpire() with { Peak = new(500, YearPrecision.Exact) }, "peak.year must be between" },
        { ValidEmpire() with { Area = new(0, AreaPrecision.Exact) }, "area.km2" },
        { ValidEmpire() with { Continents = [] }, "at least one continent" },
        { ValidEmpire() with { Continents = [Continent.Asia, Continent.Asia], PrimaryContinent = Continent.Asia }, "duplicates" },
        { ValidEmpire() with { PrimaryContinent = Continent.Africa }, "primaryContinent" },
        { ValidEmpire() with { Curiosities = [new("One.", "Um.")] }, "exactly 3" },
        { ValidEmpire() with { Capital = new("Rome", " ") }, "capital.pt is empty" },
        { ValidEmpire() with { Religion = new("Old faith — later new", "Antiga") }, "em dash" },
        { ValidEmpire() with { DurationNotes = new("Only one phase -- the rest is elsewhere", "Uma fase") }, "em dash" },
        { ValidEmpire() with { Map = new([]) }, "at least one Cliopatria polity" },
        { ValidEmpire() with { Map = new([new(" ", 100)]) }, "polity is empty" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 0)]) }, "year can't be 0" },
    };

    [Theory]
    [MemberData(nameof(InvalidEmpires))]
    public void Invalid_empires_are_reported(EmpireContent empire, string expectedMessage)
    {
        var fileSlug = expectedMessage == "must match the file name" ? "other-name" : empire.Slug;
        var errors = EmpireContentLoader.Validate(empire, fileSlug);

        Assert.Contains(errors, e => e.Contains(expectedMessage));
    }

    [Fact]
    public void Two_empires_cannot_share_a_name()
    {
        var errors = EmpireContentLoader.ValidateSet([ValidEmpire("a", "Same"), ValidEmpire("b", "same")]);
        Assert.Equal(2, errors.Count); // English and Portuguese names both clash
    }

    [Fact]
    public void Json_problems_are_reported_per_file()
    {
        var dir = Directory.CreateTempSubdirectory("imperatle-content-");
        try
        {
            File.WriteAllText(Path.Combine(dir.FullName, "typo.json"), """{ "slug": "typo", "nmae": {} }""");
            File.WriteAllText(Path.Combine(dir.FullName, "numbers.json"), """{ "slug": "numbers", "mapAccuracy": 1 }""");

            var ex = Assert.Throws<EmpireContentException>(() => EmpireContentLoader.LoadFromDirectory(dir.FullName));

            Assert.Contains(ex.Errors, e => e.StartsWith("typo.json:"));
            Assert.Contains(ex.Errors, e => e.StartsWith("numbers.json:"));
        }
        finally
        {
            dir.Delete(recursive: true);
        }
    }

    // The real content shipped with the API: catches a broken file before it
    // reaches a deploy (where it would stop the API from starting).
    [Fact]
    public void Shipped_content_is_valid()
    {
        var empires = EmpireContentLoader.LoadFromDirectory(EmpireContentLoader.DefaultDirectory);
        Assert.NotEmpty(empires);
    }

    [Fact]
    public void A_valid_shape_has_no_errors()
    {
        Assert.Empty(EmpireContentLoader.ValidateShape("""{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[1,1],[0,0]]]]}"""));
    }

    public static TheoryData<string, string> InvalidShapes => new()
    {
        { "not json", "" },
        { """{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[1,1],[0,0]]]],"properties":{"name":"Rome"}}""", "only \"type\" and \"coordinates\"" },
        { """{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[0,0]]]}""", "MultiPolygon" },
        { """{"type":"MultiPolygon","coordinates":[]}""", "non-empty" },
        { """{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[0,0]]]]}""", "at least 4 positions" },
        { """{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[1,1],[1,0]]]]}""", "isn't closed" },
        { """{"type":"MultiPolygon","coordinates":[[[[0,0],[0,100],[1,1],[0,0]]]]}""", "outside the globe" },
    };

    [Theory]
    [MemberData(nameof(InvalidShapes))]
    public void Invalid_shapes_are_reported(string json, string expectedMessage)
    {
        Assert.Contains(EmpireContentLoader.ValidateShape(json), e => e.Contains(expectedMessage));
    }

    [Fact]
    public void An_empire_with_a_map_needs_its_shape_file()
    {
        var root = Directory.CreateTempSubdirectory("imperatle-content-");
        try
        {
            var empires = root.CreateSubdirectory("empires");
            var json = System.Text.Json.JsonSerializer.Serialize(
                ValidEmpire() with { Map = new([new("Test Polity", 100)]) },
                new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
                {
                    Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
                });
            File.WriteAllText(Path.Combine(empires.FullName, "test-empire.json"), json);

            var ex = Assert.Throws<EmpireContentException>(() => EmpireContentLoader.LoadFromDirectory(empires.FullName));
            Assert.Contains(ex.Errors, e => e.Contains("shapes/test-empire.json"));

            root.CreateSubdirectory("shapes");
            File.WriteAllText(Path.Combine(root.FullName, "shapes", "test-empire.json"), """{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[1,1],[0,0]]]]}""");
            var loaded = Assert.Single(EmpireContentLoader.LoadFromDirectory(empires.FullName));
            Assert.Equal("""{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[1,1],[0,0]]]]}""", loaded.MapShape);
        }
        finally
        {
            root.Delete(recursive: true);
        }
    }
}
