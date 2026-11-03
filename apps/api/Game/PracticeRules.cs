using Imperatle.Api.Dtos;
using Imperatle.Api.Models;

namespace Imperatle.Api.Game;

public static class PracticeRules
{
    public const int MinAttempts = 3;
    public const int MaxAttempts = 10;

    // Empires from a player's most recent rounds that are held back, so
    // "play again" doesn't serve the same few empires in a row. Relaxed when
    // the filters leave nothing else.
    public const int RecentRoundsHeldBack = 10;

    // Options must match at least this many empires: with a single one,
    // every round would be the same empire.
    public const int MinPoolSize = 2;

    // The 409 code every practice endpoint answers until today's daily game
    // is over (see PracticeController).
    public const string DailyNotFinished = "daily_not_finished";

    // What a practice round may be drawn from: one active empire with a map.
    public record Candidate(int Id, string Slug, long PeakAreaKm2, int ReferenceYear, IReadOnlyCollection<Continent> PrimaryContinents);

    public static bool IsValid(PracticeOptions options) =>
        options.Attempts is >= MinAttempts and <= MaxAttempts
        && Enum.IsDefined(options.Difficulty)
        && Enum.IsDefined(options.Map)
        && (options.Era is null || Enum.IsDefined(options.Era.Value))
        && (options.Continent is null || Enum.IsDefined(options.Continent.Value));

    // The ids matching the options.
    public static List<int> Eligible(
        IEnumerable<Candidate> candidates,
        PracticeOptions options,
        PracticeDifficultyTiers tiers)
    {
        return candidates
            .Where(c => options.Difficulty == PracticeDifficulty.Any || tiers.TierFor(c.Slug, c.PeakAreaKm2) == options.Difficulty)
            .Where(c => options.Era is null || RevealBuilder.ComputeBroadEra(c.ReferenceYear) == options.Era)
            .Where(c => options.Continent is null || c.PrimaryContinents.Contains(options.Continent.Value))
            .Select(c => c.Id)
            .Order()
            .ToList();
    }

    // Random pick, skipping recently played empires while anything else is left.
    public static int Pick(IReadOnlyList<int> eligible, IReadOnlyCollection<int> recent, Random random)
    {
        if (eligible.Count == 0)
        {
            throw new InvalidOperationException("No empire matches the practice options.");
        }

        var fresh = eligible.Where(id => !recent.Contains(id)).ToList();
        var pool = fresh.Count > 0 ? fresh : eligible;
        return pool[random.Next(pool.Count)];
    }

    // Mid-round clues: the daily game's progression, or none at all when the
    // player turned clues off. The area/duration arrows are always given.
    public static ChallengeReveal? RevealFor(PracticeSession session, Empire empire, int attemptNumber) =>
        session.HintsEnabled && attemptNumber > 0 ? RevealBuilder.BuildReveal(empire, attemptNumber) : null;
}
