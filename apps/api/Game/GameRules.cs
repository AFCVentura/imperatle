namespace Imperatle.Api.Game;

public static class GameRules
{
    public const int AttemptsAllowed = 7;

    // Relative difference below which a guess's area is reported as
    // "Approximate" rather than definitively bigger/smaller. Tunable --
    // no playtesting behind this number yet.
    public const double AreaApproximateToleranceRatio = 0.10;

    // Peaks this close count as the same era even when the two empires
    // weren't contemporaries (see RevealBuilder.CompareEra).
    public const int EraApproximateYears = 25;

    // One clue per wrong guess, in this order (the web app lists the same):
    //   1 era · 2 map with continents · 3-5 curiosities 1 to 3 · 6 map with countries.
    // The two map clues come from the map stage; the API sends the era and
    // the curiosities.
    public const int EraClueAt = 1;
    public const int FirstCuriosityAt = 3;
    public const int CuriosityCount = 3;

    public static int CuriositiesAfter(int wrongGuesses) =>
        Math.Clamp(wrongGuesses - FirstCuriosityAt + 1, 0, CuriosityCount);
}
