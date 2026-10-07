namespace Imperatle.Api.Game;

public static class GameRules
{
    public const int AttemptsAllowed = 7;

    // Relative difference below which a guess's area/duration is reported as
    // "Approximate" rather than definitively bigger/smaller. Tunable --
    // no playtesting behind this number yet.
    public const double AreaApproximateToleranceRatio = 0.10;
    public const double DurationApproximateToleranceRatio = 0.10;
}
