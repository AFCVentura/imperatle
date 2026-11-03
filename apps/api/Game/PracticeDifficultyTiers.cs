using System.Text.Json;
using Imperatle.Api.Models;

namespace Imperatle.Api.Game;

// Difficulty tiers for practice mode, kept out of the empire content on
// purpose: Content/practice-difficulty.json lists slugs per tier (a
// suggestion the owner reviews and edits), and any empire it doesn't list
// falls back to a rule by peak area, the closest proxy the content has for
// "well known". Missing file = every empire goes by area.
public class PracticeDifficultyTiers
{
    public const long DefaultEasyAreaKm2 = 5_000_000;
    public const long DefaultMediumAreaKm2 = 1_500_000;

    private readonly Dictionary<string, PracticeDifficulty> bySlug;
    private readonly long easyAreaKm2;
    private readonly long mediumAreaKm2;

    public PracticeDifficultyTiers(
        IReadOnlyDictionary<string, PracticeDifficulty>? bySlug = null,
        long easyAreaKm2 = DefaultEasyAreaKm2,
        long mediumAreaKm2 = DefaultMediumAreaKm2)
    {
        this.bySlug = bySlug is null
            ? new Dictionary<string, PracticeDifficulty>(StringComparer.Ordinal)
            : new Dictionary<string, PracticeDifficulty>(bySlug, StringComparer.Ordinal);
        this.easyAreaKm2 = easyAreaKm2;
        this.mediumAreaKm2 = mediumAreaKm2;
    }

    public static string DefaultPath => Path.Combine(AppContext.BaseDirectory, "Content", "practice-difficulty.json");

    public PracticeDifficulty TierFor(string slug, long peakAreaKm2)
    {
        if (bySlug.TryGetValue(slug, out var tier))
        {
            return tier;
        }

        if (peakAreaKm2 >= easyAreaKm2) return PracticeDifficulty.Easy;
        if (peakAreaKm2 >= mediumAreaKm2) return PracticeDifficulty.Medium;
        return PracticeDifficulty.Hard;
    }

    public static PracticeDifficultyTiers LoadFromFile(string path) =>
        File.Exists(path) ? Parse(File.ReadAllText(path)) : new PracticeDifficultyTiers();

    public static PracticeDifficultyTiers Parse(string json)
    {
        var file = JsonSerializer.Deserialize<TiersFile>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidDataException("practice-difficulty.json is empty.");

        var bySlug = new Dictionary<string, PracticeDifficulty>(StringComparer.Ordinal);
        void Add(List<string>? slugs, PracticeDifficulty tier)
        {
            foreach (var slug in slugs ?? [])
            {
                // A slug listed twice keeps its first tier, so a stray
                // duplicate can't silently move an empire to another one.
                bySlug.TryAdd(slug, tier);
            }
        }
        Add(file.Easy, PracticeDifficulty.Easy);
        Add(file.Medium, PracticeDifficulty.Medium);
        Add(file.Hard, PracticeDifficulty.Hard);

        return new PracticeDifficultyTiers(
            bySlug,
            file.ThresholdsKm2?.Easy ?? DefaultEasyAreaKm2,
            file.ThresholdsKm2?.Medium ?? DefaultMediumAreaKm2);
    }

    private record TiersFile(Thresholds? ThresholdsKm2, List<string>? Easy, List<string>? Medium, List<string>? Hard);

    private record Thresholds(long? Easy, long? Medium);
}
