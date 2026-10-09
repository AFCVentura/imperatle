using System.Text.RegularExpressions;
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
        { ValidEmpire() with { Map = new("Mongol Map.PNG") }, "map.file" },
        { ValidEmpire() with { Map = new("mongol-empire.webp") }, "map.file" },
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
    public void Every_map_file_referenced_by_the_content_exists()
    {
        var mapsDir = Path.Combine(RepoRoot(), "apps", "web", "public", "maps");
        var missing = EmpireContentLoader.LoadFromDirectory(EmpireContentLoader.DefaultDirectory)
            .Where(e => e.Map is not null && !File.Exists(Path.Combine(mapsDir, e.Map.File)))
            .Select(e => $"{e.Slug}: {e.Map!.File}")
            .ToList();

        Assert.Empty(missing);
    }

    // The file name is already a neutral code, but an SVG can still carry the
    // original name inside (Inkscape's sodipodi:docname, <title>, labels).
    [Fact]
    public void No_svg_map_names_its_empire()
    {
        var mapsDir = Path.Combine(RepoRoot(), "apps", "web", "public", "maps");
        string[] generic = ["empire", "império", "imperio"];
        var leaks = new List<string>();
        foreach (var e in EmpireContentLoader.LoadFromDirectory(EmpireContentLoader.DefaultDirectory)
                     .Where(e => e.Map is not null && e.Map.File.EndsWith(".svg")))
        {
            var svg = File.ReadAllText(Path.Combine(mapsDir, e.Map!.File));
            var words = e.Slug.Split('-').Concat($"{e.Name.En} {e.Name.Pt}".Split(' '))
                .Select(w => w.ToLowerInvariant())
                .Where(w => w.Length >= 4 && !generic.Contains(w))
                .Distinct();
            leaks.AddRange(words
                .Where(w => Regex.IsMatch(svg, $@"(?<!\p{{L}}){Regex.Escape(w)}(?!\p{{L}})", RegexOptions.IgnoreCase))
                .Select(w => $"{e.Map.File} ({e.Slug}) mentions \"{w}\""));
        }

        Assert.Empty(leaks);
    }

    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "global.json")))
        {
            dir = dir.Parent;
        }
        return dir?.FullName ?? throw new DirectoryNotFoundException("Repository root (global.json) not found.");
    }
}
