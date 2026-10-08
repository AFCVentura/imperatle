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

    [GeneratedRegex(@"^[a-z0-9-]+\.(svg|png|webp|jpg|jpeg)$")]
    private static partial Regex MapFilePattern();

    public static string DefaultDirectory => Path.Combine(AppContext.BaseDirectory, "Content", "empires");

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

        if (empire.Map is not null && !MapFilePattern().IsMatch(empire.Map.File))
        {
            errors.Add($"map.file \"{empire.Map.File}\" must be a lowercase file name ending in .svg, .png, .webp, .jpg or .jpeg");
        }

        return errors;
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
