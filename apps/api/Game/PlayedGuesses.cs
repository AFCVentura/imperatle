using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Game;

// The guesses of a round, from the slugs stored on its progress row. Slugs
// rather than ids: they're the content's identity and survive a re-import.
public static class PlayedGuesses
{
    public static async Task<List<PlayedGuess>> BuildAsync(
        ImperatleDbContext db, IReadOnlyList<string> slugs, Empire target, CancellationToken ct = default)
    {
        if (slugs.Count == 0)
        {
            return [];
        }

        var distinct = slugs.Distinct().ToList();
        var empires = await db.Empires
            .AsNoTracking()
            .Where(e => distinct.Contains(e.Slug))
            .ToDictionaryAsync(e => e.Slug, ct);

        // A slug whose empire was removed from the content since is skipped;
        // the client then falls back to placeholder rows for the count.
        return slugs
            .Where(empires.ContainsKey)
            .Select(slug =>
            {
                var empire = empires[slug];
                var correct = empire.Id == target.Id;
                return new PlayedGuess(
                    empire.Id,
                    empire.NameEn,
                    empire.NamePt,
                    correct,
                    correct ? null : RevealBuilder.BuildComparison(empire, target));
            })
            .ToList();
    }

    public static async Task<ChallengeProgressResponse> ProgressAsync(
        ImperatleDbContext db, DateOnly date, Empire target, PlayerChallengeProgress? progress, CancellationToken ct = default)
    {
        var attemptsUsed = progress?.AttemptsUsed ?? 0;
        var completed = progress?.Completed ?? false;
        return new ChallengeProgressResponse(
            date,
            attemptsUsed,
            completed,
            progress?.Correct ?? false,
            progress is null ? [] : await BuildAsync(db, progress.GuessedSlugs, target, ct),
            !completed && attemptsUsed > 0 ? RevealBuilder.BuildReveal(target, attemptsUsed) : null,
            completed ? RevealBuilder.BuildAnswer(target) : null);
    }
}
