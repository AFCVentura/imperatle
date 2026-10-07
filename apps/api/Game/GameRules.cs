namespace Imperatle.Api.Game;

public static class GameRules
{
    public const int AttemptsAllowed = 7;

    // Anchors the "Imperatle #N" numbering shown in the UI. Day 1 is today --
    // trivial to move earlier once a real launch date is picked.
    public static readonly DateOnly LaunchDate = new(2026, 9, 16);

    public static int ChallengeNumber(DateOnly date) => date.DayNumber - LaunchDate.DayNumber + 1;

    // Relative difference below which a guess's area/duration is reported as
    // "Approximate" rather than definitively bigger/smaller. Tunable --
    // no playtesting behind this number yet.
    public const double AreaApproximateToleranceRatio = 0.10;
    public const double DurationApproximateToleranceRatio = 0.10;
}
