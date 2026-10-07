namespace Imperatle.Api.Dtos;

public record StatsResponse(PlayerStats Me, CommunityStats Today);

// Distribution[i] = games won on attempt i + 1.
public record PlayerStats(
    int Played,
    int Wins,
    int CurrentStreak,
    int MaxStreak,
    int[] Distribution,
    TodayResult? TodayResult);

// The player's finished game for today, if any.
public record TodayResult(bool Correct, int Attempts);

// Everyone's finished games for today's challenge (the player included).
public record CommunityStats(
    DateOnly Date,
    int ChallengeNumber,
    int AttemptsAllowed,
    int Players,
    int Wins,
    double? AverageAttempts,
    int[] Distribution);
