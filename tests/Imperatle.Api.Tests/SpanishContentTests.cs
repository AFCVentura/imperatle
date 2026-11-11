using System.Text.Json.Nodes;
using Imperatle.Api.Data;

namespace Imperatle.Api.Tests;

// EXPECTED TO FAIL while the Spanish translation is in progress: it lists
// every shipped empire file (Content/empires) that still lacks an "es" text
// wherever it has "en" and "pt" (name, capital, language, religion, notes,
// every curiosity and its details, summary, wikipedia). Once all files are
// translated it must pass and stay green.
public class SpanishContentTests
{
    [Fact]
    public void Shipped_content_has_spanish_wherever_it_has_english_and_portuguese()
    {
        var problems = new List<string>();
        foreach (var path in Directory.GetFiles(EmpireContentLoader.DefaultDirectory, "*.json").Order(StringComparer.Ordinal))
        {
            var json = JsonNode.Parse(File.ReadAllText(path))!.AsObject();
            Collect(Path.GetFileName(path), "", json, problems);
        }

        Assert.True(problems.Count == 0,
            $"{problems.Count} Spanish text(s) missing or invalid:\n" + string.Join("\n", problems));
    }

    private static void Collect(string file, string field, JsonNode? node, List<string> problems)
    {
        switch (node)
        {
            case JsonObject obj:
                if (obj.ContainsKey("en") && obj.ContainsKey("pt"))
                {
                    var name = field.Length == 0 ? "es" : $"{field}.es";
                    var es = obj["es"] is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;
                    if (string.IsNullOrWhiteSpace(es))
                    {
                        problems.Add($"{file}: {name} is missing");
                    }
                    else if (es.Contains('—') || es.Contains("--"))
                    {
                        problems.Add($"{file}: {name} has an em dash or \"--\"");
                    }
                }
                foreach (var (key, child) in obj)
                {
                    // The map's parts and rings hold no text.
                    if (field.Length == 0 && key == "map")
                    {
                        continue;
                    }
                    Collect(file, field.Length == 0 ? key : $"{field}.{key}", child, problems);
                }
                break;
            case JsonArray array:
                for (var i = 0; i < array.Count; i++)
                {
                    Collect(file, $"{field}[{i}]", array[i], problems);
                }
                break;
        }
    }
}
