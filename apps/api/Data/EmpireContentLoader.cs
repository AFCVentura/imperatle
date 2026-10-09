using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Imperatle.Api.Data;

public class EmpireContentException(IReadOnlyList<string> errors)
    : Exception("Invalid empire content:\n- " + string.Join("\n- ", errors))
{
    public IReadOnlyList<string> Errors { get; } = errors;
}

// Reads and validates every Content/empires/*.json file. All problems are
// collected and reported together, so a content pass can be fixed in one go
// instead of one error per restart.
public static partial class EmpireContentLoader
{
    public const int CuriosityCount = 3;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        // Typos in property names, missing properties and nulls are errors,
        // not silently ignored defaults.
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        RespectNullableAnnotations = true,
        RespectRequiredConstructorParameters = true,
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) },
    };

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    public static string DefaultDirectory => Path.Combine(AppContext.BaseDirectory, "Content", "empires");

    // Shapes live next to the empires folder: Content/shapes/<slug>.json.
    public static string ShapesDirectoryFor(string empiresDirectory) =>
        Path.Combine(Path.GetDirectoryName(Path.TrimEndingDirectorySeparator(Path.GetFullPath(empiresDirectory)))!, "shapes");

    public static IReadOnlyList<EmpireContent> LoadFromDirectory(string directory)
    {
        if (!Directory.Exists(directory))
        {
            throw new EmpireContentException([$"Content folder not found: {directory}"]);
        }

        var errors = new List<string>();
        var empires = new List<EmpireContent>();

        foreach (var path in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
        {
            var fileName = Path.GetFileName(path);
            EmpireContent? empire;
            try
            {
                empire = JsonSerializer.Deserialize<EmpireContent>(File.ReadAllText(path), JsonOptions);
            }
            catch (JsonException ex)
            {
                errors.Add($"{fileName}: {ex.Message}");
                continue;
            }

            if (empire is null)
            {
                errors.Add($"{fileName}: empty file");
                continue;
            }

            errors.AddRange(Validate(empire, Path.GetFileNameWithoutExtension(path)).Select(e => $"{fileName}: {e}"));
            if (empire.Map is not null)
            {
                var shapePath = Path.Combine(ShapesDirectoryFor(directory), $"{empire.Slug}.json");
                if (!File.Exists(shapePath))
                {
                    errors.Add($"{fileName}: map has no shape file (shapes/{empire.Slug}.json); run scripts/maps/build-shapes.mjs");
                }
                else
                {
                    var shape = File.ReadAllText(shapePath).Trim();
                    errors.AddRange(ValidateShape(shape).Select(e => $"shapes/{empire.Slug}.json: {e}"));
                    empire = empire with { MapShape = shape };
                }
            }
            empires.Add(empire);
        }

        errors.AddRange(ValidateSet(empires));

        if (errors.Count > 0)
        {
            throw new EmpireContentException(errors);
        }

        return empires;
    }

    // Rules for a single file. fileSlug is the file name without .json.
    public static List<string> Validate(EmpireContent empire, string fileSlug)
    {
        var errors = new List<string>();

        if (!SlugPattern().IsMatch(empire.Slug))
        {
            errors.Add($"slug \"{empire.Slug}\" must be lowercase words separated by hyphens");
        }
        if (empire.Slug != fileSlug)
        {
            errors.Add($"slug \"{empire.Slug}\" must match the file name \"{fileSlug}.json\"");
        }

        CheckText(errors, "name", empire.Name);
        CheckText(errors, "capital", empire.Capital);
        CheckText(errors, "language", empire.Language);
        CheckText(errors, "religion", empire.Religion);
        if (empire.DurationNotes is not null)
        {
            CheckText(errors, "durationNotes", empire.DurationNotes);
        }
        if (empire.ReligionNotes is not null)
        {
            CheckText(errors, "religionNotes", empire.ReligionNotes);
        }

        foreach (var (name, year) in new[] { ("peak", empire.Peak), ("start", empire.Start), ("end", empire.End) })
        {
            if (year.Year == 0)
            {
                errors.Add($"{name}.year can't be 0 (there is no year 0: use -1 for 1 BCE, 1 for 1 CE)");
            }
        }
        if (empire.Start.Year > empire.End.Year)
        {
            errors.Add("start.year must not be after end.year");
        }
        if (empire.Peak.Year < empire.Start.Year || empire.Peak.Year > empire.End.Year)
        {
            errors.Add("peak.year must be between start.year and end.year");
        }

        if (empire.Area.Km2 <= 0)
        {
            errors.Add("area.km2 must be positive");
        }

        if (empire.Continents.Count == 0)
        {
            errors.Add("continents must list at least one continent");
        }
        if (empire.Continents.Distinct().Count() != empire.Continents.Count)
        {
            errors.Add("continents has duplicates");
        }
        if (!empire.Continents.Contains(empire.PrimaryContinent))
        {
            errors.Add("primaryContinent must be one of continents");
        }

        if (empire.Curiosities.Count != CuriosityCount)
        {
            errors.Add($"curiosities must have exactly {CuriosityCount} items (has {empire.Curiosities.Count})");
        }
        for (var i = 0; i < empire.Curiosities.Count; i++)
        {
            CheckText(errors, $"curiosities[{i}]", empire.Curiosities[i]);
        }

        if (empire.Map is not null)
        {
            if (empire.Map.Parts.Count == 0)
            {
                errors.Add("map.parts must list at least one Cliopatria polity");
            }
            for (var i = 0; i < empire.Map.Parts.Count; i++)
            {
                var part = empire.Map.Parts[i];
                if (string.IsNullOrWhiteSpace(part.Polity))
                {
                    errors.Add($"map.parts[{i}].polity is empty");
                }
                if (part.Year == 0)
                {
                    errors.Add($"map.parts[{i}].year can't be 0 (there is no year 0)");
                }
            }
        }

        return errors;
    }

    // A shape is a GeoJSON MultiPolygon with nothing else in it: no names or
    // properties that could give the answer away, every ring closed and every
    // position a real longitude/latitude.
    public static List<string> ValidateShape(string json)
    {
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            return [ex.Message];
        }

        using (doc)
        {
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return ["must be a GeoJSON object"];
            }

            var errors = new List<string>();
            var extra = root.EnumerateObject().Select(p => p.Name).Except(["type", "coordinates"]).ToList();
            if (extra.Count > 0)
            {
                errors.Add($"only \"type\" and \"coordinates\" are allowed (found {string.Join(", ", extra)})");
            }
            if (!root.TryGetProperty("type", out var type) || type.ValueKind != JsonValueKind.String || type.GetString() != "MultiPolygon")
            {
                errors.Add("type must be \"MultiPolygon\"");
            }
            if (!root.TryGetProperty("coordinates", out var polygons) || polygons.ValueKind != JsonValueKind.Array || polygons.GetArrayLength() == 0)
            {
                errors.Add("coordinates must be a non-empty array of polygons");
                return errors;
            }

            var p = 0;
            foreach (var polygon in polygons.EnumerateArray())
            {
                if (polygon.ValueKind != JsonValueKind.Array || polygon.GetArrayLength() == 0)
                {
                    errors.Add($"polygon {p} has no rings");
                }
                else
                {
                    var r = 0;
                    foreach (var ring in polygon.EnumerateArray())
                    {
                        if (CheckRing(ring) is { } ringError)
                        {
                            errors.Add($"polygon {p}, ring {r}: {ringError}");
                        }
                        r++;
                    }
                }
                p++;
                if (errors.Count >= 10)
                {
                    errors.Add("(stopped after 10 errors)");
                    break;
                }
            }
            return errors;
        }
    }

    private static string? CheckRing(JsonElement ring)
    {
        if (ring.ValueKind != JsonValueKind.Array || ring.GetArrayLength() < 4)
        {
            return "a ring needs at least 4 positions";
        }
        foreach (var position in ring.EnumerateArray())
        {
            if (position.ValueKind != JsonValueKind.Array || position.GetArrayLength() != 2
                || position[0].ValueKind != JsonValueKind.Number || position[1].ValueKind != JsonValueKind.Number)
            {
                return "positions must be [longitude, latitude]";
            }
            var (lon, lat) = (position[0].GetDouble(), position[1].GetDouble());
            if (lon is < -180 or > 180 || lat is < -90 or > 90)
            {
                return $"[{lon}, {lat}] is outside the globe";
            }
        }
        var first = ring[0];
        var last = ring[ring.GetArrayLength() - 1];
        return first[0].GetDouble() == last[0].GetDouble() && first[1].GetDouble() == last[1].GetDouble()
            ? null
            : "ring isn't closed (the last position must repeat the first)";
    }

    // Rules across all files: two empires can't share a slug or a name, or the
    // guess list would be ambiguous.
    public static List<string> ValidateSet(IReadOnlyList<EmpireContent> empires)
    {
        var errors = new List<string>();
        foreach (var group in empires.GroupBy(e => e.Name.En.Trim(), StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1))
        {
            errors.Add($"name.en \"{group.Key}\" is used by {string.Join(", ", group.Select(e => e.Slug))}");
        }
        foreach (var group in empires.GroupBy(e => e.Name.Pt.Trim(), StringComparer.OrdinalIgnoreCase).Where(g => g.Count() > 1))
        {
            errors.Add($"name.pt \"{group.Key}\" is used by {string.Join(", ", group.Select(e => e.Slug))}");
        }
        return errors;
    }

    private static void CheckText(List<string> errors, string field, LocalizedText text)
    {
        foreach (var (lang, value) in new[] { ("en", text.En), ("pt", text.Pt) })
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                errors.Add($"{field}.{lang} is empty");
            }
            else if (value.Contains('—') || value.Contains("--"))
            {
                // House style: no em dashes in player-facing text.
                errors.Add($"{field}.{lang} has an em dash or \"--\"; use a comma, colon, period or parentheses");
            }
        }
    }
}
