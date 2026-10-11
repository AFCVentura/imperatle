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

    [Fact]
    public void An_empire_that_still_exists_has_no_end()
    {
        Assert.Empty(EmpireContentLoader.Validate(ValidEmpire() with { End = null }, "test-empire"));
        var future = ValidEmpire() with { End = null, Peak = new(DateTime.UtcNow.Year + 1, YearPrecision.Exact) };
        Assert.Contains(EmpireContentLoader.Validate(future, "test-empire"), e => e.Contains("this year"));
    }

    [Fact]
    public void Areas_drawn_by_hand_are_valid_parts()
    {
        var empire = ValidEmpire() with
        {
            Map = new([
                new("Roman Empire", 117),
                new(Draw: "add", Ring: [[10, 40], [12, 40], [12, 42]]),
                new(Draw: "add", Ring: [[178, 65], [185, 65], [185, 68]]), // across the antimeridian
                new(Draw: "remove", Ring: [[44, 12], [46, 12], [46, 14], [44, 14]]),
            ]),
        };
        Assert.Empty(EmpireContentLoader.Validate(empire, "test-empire"));
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
        { ValidEmpire() with { Wikipedia = new("https://en.wikipedia.org/wiki/Rome", "https://en.wikipedia.org/wiki/Rome") }, "wikipedia.pt" },
        { ValidEmpire() with { Wikipedia = new("Roman Empire", "https://pt.wikipedia.org/wiki/Roma") }, "wikipedia.en" },
        { ValidEmpire() with { Map = new([]) }, "at least one Cliopatria polity" },
        { ValidEmpire() with { Map = new([new(Country: "PYF")]) }, "at least one Cliopatria polity" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Country: "pyf")]) }, "3-letter code" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new("Gaul", 117, "FRA")]) }, "not both" },
        { ValidEmpire() with { Map = new([new("Roman Empire")]) }, "year is missing" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Country: "RUS", Box: [-165, 60, -180, 70])]) }, "west < east" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117, Box: [0, 0, 1, 1])]) }, "only applies to a country" },
        { ValidEmpire() with { Map = new([new(Draw: "add", Ring: [[0, 0], [1, 0], [1, 1]])]) }, "at least one Cliopatria polity" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Draw: "erase", Ring: [[0, 0], [1, 0], [1, 1]])]) }, "\"add\" or \"remove\"" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Draw: "remove", Ring: [[0, 0], [1, 0]])]) }, "at least 3" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Draw: "remove", Ring: [[0, 0], [1, 0], [1, 95]])]) }, "at least 3" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Draw: "remove", Ring: [[0, 0], [1, 0], [400, 1]])]) }, "at least 3" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Draw: "remove")]) }, "ring must have" },
        { ValidEmpire() with { Map = new([new("Roman Empire", 117), new(Country: "FRA", Draw: "add", Ring: [[0, 0], [1, 0], [1, 1]])]) }, "nothing else" },
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

    // "end": null reads as an empire that still exists; leaving "end" out is
    // still an error, so a forgotten field isn't mistaken for "still exists".
    [Fact]
    public void An_end_of_null_reads_as_still_existing()
    {
        var root = Directory.CreateTempSubdirectory("imperatle-content-");
        try
        {
            var empires = Directory.CreateDirectory(Path.Combine(root.FullName, "empires"));
            var shapes = Directory.CreateDirectory(Path.Combine(root.FullName, "shapes"));
            var source = EmpireContentLoader.DefaultDirectory;
            var json = System.Text.Json.Nodes.JsonNode.Parse(File.ReadAllText(Path.Combine(source, "roman-empire.json")))!.AsObject();
            json["end"] = null;
            File.WriteAllText(Path.Combine(empires.FullName, "roman-empire.json"), json.ToJsonString());
            File.Copy(Path.Combine(EmpireContentLoader.ShapesDirectoryFor(source), "roman-empire.json"), Path.Combine(shapes.FullName, "roman-empire.json"));

            Assert.Null(Assert.Single(EmpireContentLoader.LoadFromDirectory(empires.FullName)).End);

            json.Remove("end");
            File.WriteAllText(Path.Combine(empires.FullName, "roman-empire.json"), json.ToJsonString());
            Assert.Throws<EmpireContentException>(() => EmpireContentLoader.LoadFromDirectory(empires.FullName));
        }
        finally
        {
            root.Delete(recursive: true);
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

    [Fact]
    public void A_shape_across_the_antimeridian_keeps_going_past_180()
    {
        Assert.Empty(EmpireContentLoader.ValidateShape("""{"type":"MultiPolygon","coordinates":[[[[178,65],[185,65],[185,68],[178,65]]]]}"""));
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
        { """{"type":"MultiPolygon","coordinates":[[[[0,0],[400,1],[1,1],[0,0]]]]}""", "outside the globe" },
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
