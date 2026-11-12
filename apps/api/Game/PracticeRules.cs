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
        && (options.Eras ?? []).All(Enum.IsDefined)
        && (options.Continents ?? []).All(Enum.IsDefined);

    // The ids matching the options.
    public static List<int> Eligible(
        IEnumerable<Candidate> candidates,
        PracticeOptions options,
        PracticeDifficultyTiers tiers)
    {
        var eras = options.Eras ?? [];
        var continents = options.Continents ?? [];
        return candidates
            .Where(c => options.Difficulty == PracticeDifficulty.Any || tiers.TierFor(c.Slug, c.PeakAreaKm2) == options.Difficulty)
            .Where(c => eras.Length == 0 || eras.Contains(RevealBuilder.ComputeBroadEra(c.ReferenceYear)))
            .Where(c => continents.Length == 0 || c.PrimaryContinents.Any(continents.Contains))
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

    // How many clues of the daily game's queue (GameRules: era, map with
    // continents, 3 curiosities, map with countries) are out after this many
    // wrong guesses. Off: one per wrong guess, like the daily game, so 3
    // attempts never get past the second clue and 10 run out at the 6th
    // error. Adaptive (the default): the six clues are spread over the
    // wrong guesses the round allows, the last one arriving with the last
    // wrong guess, rounded half up. With 7 attempts both are the same.
    // The web app has the same function (lib/clues.ts, clueStep).
    public static int ClueStep(int wrongGuesses, int attemptsAllowed, bool adaptive)
    {
        if (wrongGuesses <= 0)
        {
            return 0;
        }
        if (!adaptive || attemptsAllowed <= 1)
        {
            return Math.Min(wrongGuesses, GameRules.ClueCount);
        }
        var wrongAllowed = attemptsAllowed - 1;
        // floor(wrong * clues / wrongAllowed + 1/2), in integers.
        var step = (2 * wrongGuesses * GameRules.ClueCount + wrongAllowed) / (2 * wrongAllowed);
        return Math.Min(step, GameRules.ClueCount);
    }

    // Mid-round clues: the daily game's progression (or spread over the
    // round's attempts, see ClueStep), or none at all when the player turned
    // clues off. The area/duration arrows are always given.
    public static ChallengeReveal? RevealFor(PracticeSession session, Empire empire, int attemptNumber)
    {
        if (!session.HintsEnabled || attemptNumber <= 0)
        {
            return null;
        }
        var step = ClueStep(attemptNumber, session.AttemptsAllowed, session.AdaptiveHints);
        return step > 0 ? RevealBuilder.BuildReveal(empire, step) : null;
    }
}
