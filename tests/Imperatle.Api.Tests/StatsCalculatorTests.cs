using Imperatle.Api.Game;
using Imperatle.Api.Models;

namespace Imperatle.Api.Tests;

public class StatsCalculatorTests
{
    private static readonly DateOnly Today = new(2026, 10, 7);

    private static PlayerChallengeProgress Game(int daysAgo, bool correct, int attempts = 3) => new()
    {
        Date = Today.AddDays(-daysAgo),
        Completed = true,
        Correct = correct,
        AttemptsUsed = attempts,
    };

    [Fact]
    public void Consecutive_wins_make_a_streak()
    {
        var stats = StatsCalculator.ForPlayer([Game(2, true), Game(1, true), Game(0, true)], Today);

        Assert.Equal(3, stats.Played);
        Assert.Equal(3, stats.CurrentStreak);
        Assert.Equal(3, stats.MaxStreak);
    }

    [Fact]
    public void A_loss_breaks_the_streak()
    {
        var stats = StatsCalculator.ForPlayer([Game(3, true), Game(2, true), Game(1, false), Game(0, true)], Today);

        Assert.Equal(1, stats.CurrentStreak);
        Assert.Equal(2, stats.MaxStreak);
    }

    [Fact]
    public void A_skipped_day_breaks_the_streak()
    {
        var stats = StatsCalculator.ForPlayer([Game(3, true), Game(1, true)], Today);
        Assert.Equal(1, stats.MaxStreak);
    }

    [Fact]
    public void Not_having_played_today_yet_keeps_yesterdays_streak()
    {
        var stats = StatsCalculator.ForPlayer([Game(2, true), Game(1, true)], Today);

        Assert.Equal(2, stats.CurrentStreak);
        Assert.Null(stats.TodayResult);
    }

    [Fact]
    public void A_full_day_without_playing_ends_the_streak()
    {
        var stats = StatsCalculator.ForPlayer([Game(3, true), Game(2, true)], Today);
        Assert.Equal(0, stats.CurrentStreak);
    }

    [Fact]
    public void Distribution_counts_wins_by_attempt()
    {
        var stats = StatsCalculator.ForPlayer([Game(2, true, 1), Game(1, true, 3), Game(0, false, 7)], Today);

        Assert.Equal([1, 0, 1, 0, 0, 0, 0], stats.Distribution);
        Assert.Equal(new(false, 7), stats.TodayResult);
    }

    [Fact]
    public void Community_stats_average_only_the_wins()
    {
        var stats = StatsCalculator.ForToday([Game(0, true, 2), Game(0, true, 4), Game(0, false, 7)], Today, challengeNumber: 12);

        Assert.Equal(12, stats.ChallengeNumber);
        Assert.Equal(3, stats.Players);
        Assert.Equal(2, stats.Wins);
        Assert.Equal(3.0, stats.AverageAttempts);
        Assert.Equal([0, 1, 0, 1, 0, 0, 0], stats.Distribution);
    }

    [Fact]
    public void Nobody_finished_yet()
    {
        var stats = StatsCalculator.ForToday([], Today, challengeNumber: 1);

        Assert.Equal(0, stats.Players);
        Assert.Null(stats.AverageAttempts);
    }
}
