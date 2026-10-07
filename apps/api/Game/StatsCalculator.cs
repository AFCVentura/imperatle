using Imperatle.Api.Dtos;
using Imperatle.Api.Models;

namespace Imperatle.Api.Game;

public static class StatsCalculator
{
    // `games` = one player's finished games, any order.
    public static PlayerStats ForPlayer(IReadOnlyCollection<PlayerChallengeProgress> games, DateOnly today)
    {
        var distribution = new int[GameRules.AttemptsAllowed];
        foreach (var game in games.Where(g => g.Correct))
        {
            distribution[Math.Clamp(game.AttemptsUsed, 1, GameRules.AttemptsAllowed) - 1]++;
        }

        // A streak is consecutive days won: a loss or a skipped day breaks it.
        var maxStreak = 0;
        var streak = 0;
        DateOnly? previousWin = null;
        foreach (var game in games.OrderBy(g => g.Date))
        {
            if (!game.Correct)
            {
                streak = 0;
                previousWin = null;
                continue;
            }

            streak = previousWin is { } prev && prev.AddDays(1) == game.Date ? streak + 1 : 1;
            previousWin = game.Date;
            maxStreak = Math.Max(maxStreak, streak);
        }

        // The current streak survives until today's game is lost or a whole
        // day goes by without a win -- not playing yet today doesn't break it.
        var lastGame = games.MaxBy(g => g.Date);
        var currentStreak = lastGame is { Correct: true } && lastGame.Date >= today.AddDays(-1) ? streak : 0;

        var todayGame = games.FirstOrDefault(g => g.Date == today);
        return new PlayerStats(
            games.Count,
            games.Count(g => g.Correct),
            currentStreak,
            maxStreak,
            distribution,
            todayGame is null ? null : new TodayResult(todayGame.Correct, todayGame.AttemptsUsed));
    }

    // `games` = everyone's finished games for today's challenge.
    public static CommunityStats ForToday(IReadOnlyCollection<PlayerChallengeProgress> games, DateOnly today)
    {
        var wins = games.Where(g => g.Correct).ToList();
        var distribution = new int[GameRules.AttemptsAllowed];
        foreach (var game in wins)
        {
            distribution[Math.Clamp(game.AttemptsUsed, 1, GameRules.AttemptsAllowed) - 1]++;
        }

        return new CommunityStats(
            today,
            GameRules.ChallengeNumber(today),
            GameRules.AttemptsAllowed,
            games.Count,
            wins.Count,
            wins.Count > 0 ? Math.Round(wins.Average(g => g.AttemptsUsed), 1) : null,
            distribution);
    }
}
